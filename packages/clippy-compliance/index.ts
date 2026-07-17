/**
 * Clippy Compliance System — TypeScript Entry Point
 * Re-exports the JS compliance engine for use in Next.js apps
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const rulesEngine = require("./clippy-rules.engine.js");
const { STATE, STATE_DISCLAIMERS, RENTAL_RULES, VALUE_RULES, LEGAL_RULES, checkFairHousing, detectState, JURISDICTION_CONFIG } = require("./jurisdiction/australia/rules");
const { HANDOFF_REASONS, shouldHandoff, buildHandoffNotification, buildHandoffResponse } = require("./handoff/handoff-protocol");
const { FLOW_STATES: BUYER_FLOW } = require("./flows/buyer-qualification");
const { FLOW_STATES: RENTAL_FLOW } = require("./flows/rental-inquiry");
const { FLOW_STATES: SELLER_FLOW } = require("./flows/seller-qualification");
const { FLOW_STATES: APPRAISAL_FLOW } = require("./flows/appraisal-request");
const { FLOW_STATES: INSPECTION_FLOW } = require("./flows/inspection-followup");
const { DISCLAIMER_TEMPLATES, detectDisclaimerTypes, getDisclaimerText, processResponse } = require("./guardrails/disclaimer-engine");
const { sanitizeAiResponse } = require("./guardrails/content-filter");
const { scoreMessage, determineEscalation, RISK_LEVEL } = require("./guardrails/escalation-matrix");

const fs = require("fs");
const path = require("path");

class ClippyCompliance {
  jurisdiction: string;
  state: string;
  agency: { name: string; license?: string };
  platform: string;
  agentName: string;
  promptsDir: string;
  private _systemMaster: string | null;
  private _platformPrompts: string | null;

  constructor(config: any = {}) {
    this.jurisdiction = config.jurisdiction || "australia";
    this.state = config.state || "VIC";
    this.agency = config.agency || { name: "our agency" };
    this.platform = config.platform || "whatsapp";
    this.agentName = config.agentName || "Clippy";
    this.promptsDir = path.join(__dirname, "prompts");
    this._systemMaster = null;
    this._platformPrompts = null;
  }

  systemMasterPrompt(): string {
    if (!this._systemMaster) {
      try {
        this._systemMaster = fs.readFileSync(path.join(this.promptsDir, "system-master.md"), "utf8");
      } catch {
        this._systemMaster = "Clippy AI Copilot — Communication assistant for real estate agents.";
      }
    }
    return this._systemMaster;
  }

  platformPrompt(): string {
    if (!this._platformPrompts) {
      try {
        this._platformPrompts = fs.readFileSync(path.join(this.promptsDir, "platform-prompts.md"), "utf8");
      } catch {
        this._platformPrompts = "";
      }
    }
    return this._platformPrompts;
  }

  preFlightCheck({ message, lead, platform }: { message: string; lead: any; platform: string }) {
    const p = platform || this.platform;
    return rulesEngine.preFlightCheck({
      message,
      lead,
      platform: p,
      propertyContext: {},
      agentContext: { name: this.agentName, agency: this.agency.name }
    });
  }

  gateResponse({ response, platform, replacements = {} }: { response: string; platform: string; replacements?: Record<string, string> }) {
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

  quickCheck(message: string) {
    return rulesEngine.quickCheck(message);
  }

  getSystemInstructions() {
    return rulesEngine.getSystemInstructions({
      jurisdiction: this.jurisdiction,
      state: this.state,
      platform: this.platform,
      agentName: this.agentName,
      agency: this.agency.name
    });
  }
}

export default ClippyCompliance;
export { rulesEngine, ClippyCompliance };
export { STATE, STATE_DISCLAIMERS, RENTAL_RULES, VALUE_RULES, LEGAL_RULES, checkFairHousing, detectState, JURISDICTION_CONFIG };
export { HANDOFF_REASONS, shouldHandoff, buildHandoffNotification, buildHandoffResponse };
export { BUYER_FLOW, RENTAL_FLOW, SELLER_FLOW, APPRAISAL_FLOW, INSPECTION_FLOW };
export { DISCLAIMER_TEMPLATES, detectDisclaimerTypes, getDisclaimerText, processResponse };
export { sanitizeAiResponse };
export { scoreMessage, determineEscalation, RISK_LEVEL };
