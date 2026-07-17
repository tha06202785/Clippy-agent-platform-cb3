/**
 * Clippy Compliance — ESM Wrapper for VPS Server
 * Bridges CJS module into ESM import context
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require2 = createRequire(import.meta.url);

const rulesEngine = require2(path.join(__dirname, 'clippy-rules.engine.js'));
const {
  STATE, STATE_DISCLAIMERS, RENTAL_RULES, VALUE_RULES, LEGAL_RULES,
  checkFairHousing, detectState, JURISDICTION_CONFIG
} = require2(path.join(__dirname, 'jurisdiction', 'australia', 'rules.js'));
const {
  HANDOFF_REASONS, shouldHandoff, buildHandoffNotification, buildHandoffResponse
} = require2(path.join(__dirname, 'handoff', 'handoff-protocol.js'));
const {
  FLOW_STATES: BUYER_FLOW
} = require2(path.join(__dirname, 'flows', 'buyer-qualification.js'));
const {
  FLOW_STATES: RENTAL_FLOW
} = require2(path.join(__dirname, 'flows', 'rental-inquiry.js'));
const {
  FLOW_STATES: SELLER_FLOW
} = require2(path.join(__dirname, 'flows', 'seller-qualification.js'));
const {
  FLOW_STATES: APPRAISAL_FLOW
} = require2(path.join(__dirname, 'flows', 'appraisal-request.js'));
const {
  FLOW_STATES: INSPECTION_FLOW
} = require2(path.join(__dirname, 'flows', 'inspection-followup.js'));
const {
  DISCLAIMER_TEMPLATES, detectDisclaimerTypes, getDisclaimerText, processResponse
} = require2(path.join(__dirname, 'guardrails', 'disclaimer-engine.js'));
const { sanitizeAiResponse } = require2(path.join(__dirname, 'guardrails', 'content-filter.js'));
const {
  scoreMessage, determineEscalation, RISK_LEVEL
} = require2(path.join(__dirname, 'guardrails', 'escalation-matrix.js'));

class ClippyCompliance {
  constructor(config = {}) {
    this.jurisdiction = config.jurisdiction || 'australia';
    this.state = config.state || 'VIC';
    this.platform = config.platform || 'facebook';
    this.agency = config.agency || { name: 'Clippy Agent' };
    this.agentName = config.agentName || 'Clippy';
    this.version = '1.0.0';
  }

  preFlightCheck({ message, lead = {}, platform }) {
    const ctx = rulesEngine.preFlightCheck({ message, lead, jurisdiction: this.jurisdiction, state: this.state });
    return {
      raw: ctx,
      complianceContext: {
        riskLevel: ctx.riskLevel,
        trigger: ctx.trigger,
        disclaimers: ctx.disclaimers || [],
        hotLead: ctx.hotLead || false,
        shouldEscalate: ctx.shouldEscalate || false,
        systemInstructions: ctx.systemInstructions || null,
        agentAlert: ctx.agentAlert || null,
      }
    };
  }

  gateResponse({ response, platform }) {
    const gated = rulesEngine.gateResponse({
      response,
      platform: platform || this.platform,
      jurisdiction: this.jurisdiction,
      state: this.state,
    });
    return {
      safeResponse: gated.safeResponse || response,
      requiresHandoff: gated.requiresHandoff || false,
      disclaimersApplied: gated.disclaimersApplied || [],
      flagged: gated.flagged || false,
    };
  }

  quickCheck(message) {
    const result = rulesEngine.quickCheck({ message, jurisdiction: this.jurisdiction, state: this.state });
    return {
      level: result.riskLevel,
      trigger: result.trigger,
      hotLead: result.hotLead || false,
    };
  }

  get RISK_LEVEL() { return RISK_LEVEL; }
  get STATE() { return STATE; }
  get DISCLAIMER_TEMPLATES() { return DISCLAIMER_TEMPLATES; }
  get HANDOFF_REASONS() { return HANDOFF_REASONS; }
  get FLOW_STATES() {
    return { BUYER_FLOW, RENTAL_FLOW, SELLER_FLOW, APPRAISAL_FLOW, INSPECTION_FLOW };
  }
}

export default ClippyCompliance;
export {
  rulesEngine,
  RISK_LEVEL,
  scoreMessage,
  determineEscalation,
  detectDisclaimerTypes,
  getDisclaimerText,
  processResponse,
  sanitizeAiResponse,
  shouldHandoff,
  buildHandoffNotification,
  buildHandoffResponse,
  STATE,
  STATE_DISCLAIMERS,
  checkFairHousing,
  detectState,
  JURISDICTION_CONFIG,
};