/**
 * Clippy Compliance System — Main Package Entry Point
 * Version 1.0 | 2026-05-24 | 26 Composio tools integrated
 */

const rulesEngine = require('./clippy-rules.engine');
const { ComposioCheck, TOOLKITSlug } = require('./composio-check');
const { STATE, STATE_DISCLAIMERS, RENTAL_RULES, VALUE_RULES, LEGAL_RULES, checkFairHousing, detectState, JURISDICTION_CONFIG } = require('./jurisdiction/australia/rules');
const { HANDOFF_REASONS, shouldHandoff, buildHandoffNotification, buildHandoffResponse } = require('./handoff/handoff-protocol');
const { FLOW_STATES: BUYER_FLOW } = require('./flows/buyer-qualification');
const { FLOW_STATES: RENTAL_FLOW } = require('./flows/rental-inquiry');
const { FLOW_STATES: SELLER_FLOW } = require('./flows/seller-qualification');
const { FLOW_STATES: APPRAISAL_FLOW } = require('./flows/appraisal-request');
const { FLOW_STATES: INSPECTION_FLOW } = require('./flows/inspection-followup');
const { DISCLAIMER_TEMPLATES, detectDisclaimerTypes, getDisclaimerText, processResponse } = require('./guardrails/disclaimer-engine');
const { sanitizeAiResponse } = require('./guardrails/content-filter');
const { scoreMessage, determineEscalation, RISK_LEVEL } = require('./guardrails/escalation-matrix');

const fs = require('fs');
const path = require('path');

class ClippyCompliance {
  constructor(config = {}) {
    this.jurisdiction = config.jurisdiction || 'australia';
    this.state = config.state || 'VIC';
    this.agency = config.agency || { name: 'our agency' };
    this.platform = config.platform || 'whatsapp';
    this.agentName = config.agentName || 'Clippy';
    this.promptsDir = path.join(__dirname, 'prompts');
    this._systemMaster = null;
    this._platformPrompts = null;
  }

  systemMasterPrompt() {
    if (!this._systemMaster) {
      try {
        this._systemMaster = fs.readFileSync(path.join(this.promptsDir, 'system-master.md'), 'utf8');
      } catch {
        this._systemMaster = 'Clippy AI Copilot — Communication assistant for real estate agents.';
      }
    }
    return this._systemMaster;
  }

  platformPrompt() {
    if (!this._platformPrompts) {
      try {
        this._platformPrompts = fs.readFileSync(path.join(this.promptsDir, 'platform-prompts.md'), 'utf8');
      } catch {
        this._platformPrompts = '';
      }
    }
    return this._platformPrompts;
  }

  preFlightCheck({ message, lead, platform }) {
    const p = platform || this.platform;
    return rulesEngine.preFlightCheck({
      message,
      lead,
      platform: p,
      propertyContext: {},
      agentContext: { name: this.agentName, agency: this.agency.name }
    });
  }

  gateResponse({ response, platform, replacements = {} }) {
    const p = platform || this.platform;
    return rulesEngine.gateResponse({
      response,
      platform: p,
      replacements: {
        AGENT_NAME: this.agentName,
        AGENCY_NAME: this.agency.name,
        ...replacements
      }
    });
  }

  quickCheck(message) {
    return rulesEngine.quickCheck(message);
  }

  isHotLead({ message, lead }) {
    return rulesEngine.evaluateHotLead({ message, lead });
  }

  shouldHandoff({ riskLevel, message, customerRequested, aiConfidence, escalationTrigger }) {
    return shouldHandoff({ riskLevel, message, customerRequested, aiConfidence, escalationTrigger });
  }

  buildHandoffNotification({ handoffReason, leadId, conversationId, message, context, platform }) {
    return buildHandoffNotification({ handoffReason, leadId, conversationId, message, context, platform });
  }

  buildHandoffResponse(reason, context = {}) {
    return buildHandoffResponse(reason, { ...context, AGENT_NAME: this.agentName, AGENCY_NAME: this.agency.name });
  }

  getStateDisclaimers(state) {
    return STATE_DISCLAIMERS[state] || STATE_DISCLAIMERS['VIC'];
  }

  detectState(message) {
    return detectState(message);
  }

  checkFairHousing(message) {
    return checkFairHousing(message);
  }

  get composioCheck() { return new ComposioCheck(); }
  get RISK_LEVEL() { return RISK_LEVEL; }
  get STATE() { return STATE; }
  get DISCLAIMER_TEMPLATES() { return DISCLAIMER_TEMPLATES; }
  get HANDOFF_REASONS() { return HANDOFF_REASONS; }
  get FLOW_STATES() {
    return { BUYER_FLOW, RENTAL_FLOW, SELLER_FLOW, APPRAISAL_FLOW, INSPECTION_FLOW };
  }
}

module.exports = ClippyCompliance;
module.exports.rulesEngine = rulesEngine;
module.exports.escalationMatrix = { scoreMessage, determineEscalation, RISK_LEVEL };
module.exports.disclaimerEngine = { detectDisclaimerTypes, getDisclaimerText, processResponse };
module.exports.contentFilter = { sanitizeAiResponse };
module.exports.handoff = { shouldHandoff, buildHandoffNotification, buildHandoffResponse };
module.exports.jurisdiction = { STATE, STATE_DISCLAIMERS, checkFairHousing, detectState, JURISDICTION_CONFIG };
module.exports.composio = { ComposioCheck, TOOL_COUNT: 26, TOOLKITSlug };
module.exports.version = '1.0.0';