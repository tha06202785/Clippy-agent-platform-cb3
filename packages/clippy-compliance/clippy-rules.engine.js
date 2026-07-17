/**
 * Clippy Rules Engine — Core Compliance Middleware
 * Combines input scan, guardrails, disclaimer engine, and output gate
 * Version 1.0 | 2026-05-18
 */

const { scoreMessage, determineEscalation, buildHandoffNotification, RISK_LEVEL } = require('./guardrails/escalation-matrix');
const { sanitizeAiResponse } = require('./guardrails/content-filter');
const { processResponse, detectDisclaimerTypes, getDisclaimerText } = require('./guardrails/disclaimer-engine');

const PLATFORM_MAP = {
  facebook: 'facebook',
  email: 'email',
  whatsapp: 'whatsapp',
  webchat: 'webchat',
  sms: 'sms',
  messenger: 'facebook'
};

/**
 * Main compliance engine — run before every AI response
 * @param {object} params
 * @returns {object} { response, disclaimers, guardrailResult, shouldEscalate, handoffPayload }
 */
function processMessage({ message, lead, platform = 'whatsapp', propertyContext = {}, agentContext = {} }) {
  const normalizedPlatform = PLATFORM_MAP[platform] || 'whatsapp';

  // ─── STAGE 1: INPUT SCAN ────────────────────────────────────────────────
  const scanResult = scoreMessage(message);

  // ─── STAGE 2: DETERMINE ESCALATION ────────────────────────────────────
  const escalation = determineEscalation(scanResult);

  // ─── STAGE 3: DISCLAIMER DETECTION ───────────────────────────────────
  const neededDisclaimers = detectDisclaimerTypes(message);
  const disclaimers = neededDisclaimers.map(type => ({
    type,
    text: getDisclaimerText(type, normalizedPlatform, {
      AGENT_NAME: agentContext.name || 'the team',
      AGENCY_NAME: agentContext.agency || 'our agency'
    })
  }));

  // ─── STAGE 4: BUILD RESULT ─────────────────────────────────────────────
  const result = {
    riskLevel: scanResult.riskLevel,
    trigger: scanResult.trigger,
    reason: scanResult.reason,
    action: escalation,
    disclaimers,
    shouldBlock: scanResult.riskLevel >= RISK_LEVEL.CRITICAL,
    shouldEscalate: ['HANDOFF_IMMEDIATE', 'PROCEED_WITH_DISCLAIMER'].includes(escalation),
    shouldFlag: scanResult.riskLevel >= RISK_LEVEL.MEDIUM,
    platform: normalizedPlatform
  };

  // ─── STAGE 5: HOT LEAD DETECTION ──────────────────────────────────────
  result.hotLead = evaluateHotLead({ message, lead, scanResult });

  // ─── STAGE 6: AGENT ALERT ─────────────────────────────────────────────
  if (result.shouldEscalate || result.hotLead) {
    result.agentAlert = buildAgentAlert({ result, lead, message, propertyContext, agentContext });
  }

  return result;
}

/**
 * Gate AI response before sending — filters banned phrases, appends disclaimers
 * @param {object} params
 * @returns {{ safeResponse, flags, requiresHandoff, disclaimersApplied }}
 */
function gateResponse({ response, platform = 'whatsapp', replacements = {} }) {
  const normalizedPlatform = PLATFORM_MAP[platform] || 'whatsapp';
  const sanitized = sanitizeAiResponse(response);

  const disclaimersApplied = [];

  // If flagged for any disclaimer types, apply them
  for (const flag of sanitized.flags) {
    const match = flag.match(/^FLAG_FOR_REVIEW: "(.+)"/i);
    if (match) {
      const keyword = match[1].replace(/\\/g, '');
      const matched = detectDisclaimerTypes(keyword);
      for (const type of matched) {
        const text = getDisclaimerText(type, normalizedPlatform, replacements);
        if (text && !disclaimersApplied.find(d => d.type === type)) {
          disclaimersApplied.push({ type, text });
        }
      }
    }
  }

  // Also scan the response text directly for trigger keywords
  // (the AI response may contain price/financial/legal terms that need disclaimers)
  const responseTriggers = detectDisclaimerTypes(response);
  for (const type of responseTriggers) {
    if (!disclaimersApplied.find(d => d.type === type)) {
      const text = getDisclaimerText(type, normalizedPlatform, replacements);
      if (text) {
        disclaimersApplied.push({ type, text });
      }
    }
  }

  // Build safe response with disclaimers appended
  let safeResponse = sanitized.safe;
  for (const { text } of disclaimersApplied) {
    safeResponse = `${safeResponse}\n\n${text}`;
  }

  return {
    safeResponse,
    flags: sanitized.flags,
    requiresHandoff: sanitized.requiresHandoff,
    disclaimersApplied,
    wasModified: sanitized.flags.length > 0
  };
}

/**
 * Quick check — does this message need any compliance handling?
 * @param {string} message
 * @returns {{ needsHandling: boolean, level: string }}
 */
function quickCheck(message) {
  const result = scoreMessage(message);
  return {
    needsHandling: result.riskLevel > RISK_LEVEL.LOW,
    level: result.riskLevel === RISK_LEVEL.LOW ? 'LOW'
      : result.riskLevel === RISK_LEVEL.MEDIUM ? 'MEDIUM'
      : result.riskLevel === RISK_LEVEL.HIGH ? 'HIGH'
      : 'CRITICAL',
    trigger: result.trigger,
    reason: result.reason
  };
}

/**
 * Evaluate hot lead signals
 * @param {object} params
 * @returns {boolean}
 */
function evaluateHotLead({ message, lead, scanResult }) {
  const lc = message.toLowerCase();
  const hotSignals = [
    /ready\s+to\s+(sign|buy|offer|go)/i,
    /pre-approved?\s+(and\s+)?(looking|searching|ready)/i,
    /can\s+move\s+(in\s+)?(fast|soon|immediately|next\s+week)/i,
    /need\s+to\s+(sell|buy)\s+(urgently|fast|asap|quick)/i,
    /motivated\s+(seller|buyer)/i,
    /auction\s+(this\s+)?(saturday|sunday|weekend)/i,
    /settle(ment)?\s+(in\s+)?(3|6|8|12)\s+(weeks?|months?)/i
  ];

  for (const signal of hotSignals) {
    if (signal.test(lc)) return true;
  }

  // Pre-approved leads are hot
  if (lead?.financing_status === 'pre_approved' || lead?.hot_lead_score > 50) {
    return true;
  }

  return false;
}

/**
 * Build agent alert payload
 * @param {object} params
 * @returns {object}
 */
function buildAgentAlert({ result, lead, message, propertyContext, agentContext }) {
  return {
    type: 'AGENT_ALERT',
    priority: result.riskLevel >= RISK_LEVEL.HIGH ? 'HIGH' : 'NORMAL',
    timestamp: new Date().toISOString(),
    lead: lead ? { id: lead.id, name: lead.name, phone: lead.phone } : null,
    property: propertyContext,
    issue: result.trigger,
    reason: result.reason,
    riskLevel: result.riskLevel,
    originalMessage: message,
    suggestedAction: result.shouldBlock ? 'HANDOFF_IMMEDIATE' : 'REVIEW_LATER',
    agentName: agentContext.name,
    platform: result.platform
  };
}

/**
 * Full pipeline — scan input, return AI-ready context
 * Use this BEFORE generating an AI response
 * @param {object} params
 * @returns {object} context object to inject into prompt/AI call
 */
function preFlightCheck({ message, lead, platform, propertyContext, agentContext }) {
  const result = processMessage({ message, lead, platform, propertyContext, agentContext });

  return {
    // Inject into AI prompt
    systemInstructions: buildSystemInstructions(result),
    // Inject into prompt context
    complianceContext: {
      riskLevel: result.riskLevel,
      disclaimers: result.disclaimers,
      shouldEscalate: result.shouldEscalate,
      hotLead: result.hotLead,
      agentAlert: result.agentAlert
    },
    // Raw result for logging
    raw: result
  };
}

/**
 * Build system instruction block for AI prompt injection
 * @param {object} result
 * @returns {string}
 */
function buildSystemInstructions(result) {
  const lines = [];

  if (result.shouldBlock) {
    lines.push('🚫 DO NOT RESPOND — escalate to human agent immediately.');
  }

  if (result.disclaimers.length > 0) {
    lines.push(`📋 REQUIRED DISCLAIMERS (add to response):`);
    for (const { type, text } of result.disclaimers) {
      lines.push(`  [${type}]: ${text}`);
    }
  }

  if (result.hotLead) {
    lines.push('🔥 HOT LEAD — flag agent immediately.');
  }

  return lines.join('\n');
}

module.exports = {
  processMessage,
  gateResponse,
  quickCheck,
  preFlightCheck,
  evaluateHotLead,
  buildAgentAlert,
  RISK_LEVEL
};