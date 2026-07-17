/**
 * Escalation Matrix — Clippy AI Copilot
 * Risk scoring + escalation triggers for Australian real estate compliance
 */

const RISK_LEVEL = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

const ESCALATION_TRIGGERS = {
  // CRITICAL — immediate human handoff required
  CONTRACTUAL: {
    patterns: [
      /contract\s+interpretation/i,
      /legal\s+advice/i,
      /what\s+does\s+the\s+contract\s+say/i,
      /is\s+this\s+legal/i,
      /can\s+i\s+sue/i,
      /breach\s+of\s+contract/i,
      /default\s+notice/i
    ],
    riskLevel: RISK_LEVEL.CRITICAL,
    response: 'HANDOFF_CRITICAL',
    reason: 'Contractual/legal interpretation requires human agent',
    disclaimerRequired: false
  },
  FINANCIAL_ADVICE: {
    patterns: [
      /should\s+i\s+invest/i,
      /good\s+investment/i,
      /roi\s+prediction/i,
      /capital\s+gain\s+guarantee/i,
      /property\s+will\s+(go\s+up|increase|rise)/i,
      /guaranteed\s+return/i,
      /best\s+financial\s+advice/i
    ],
    riskLevel: RISK_LEVEL.CRITICAL,
    response: 'HANDOFF_CRITICAL',
    reason: 'Financial investment advice requires licensed financial adviser',
    disclaimerRequired: false
  },
  LOAN_MORTGAGE_ADVICE: {
    patterns: [
      /should\s+i\s+get\s+a\s+loan/i,
      /how\s+much\s+can\s+i\s+borrow/i,
      /loan\s+advice/i,
      /pre-approval\s+advice/i,
      /best\s+interest\s+rate/i
    ],
    riskLevel: RISK_LEVEL.CRITICAL,
    response: 'HANDOFF_CRITICAL',
    reason: 'Loan/mortgage advice requires licensed mortgage broker',
    disclaimerRequired: false
  },
  DISCRIMINATION_RISK: {
    patterns: [
      /do\s+you\s+accept\s+(pets?|pets)\s+tenant/i,
      /what\s+type\s+of\s+tenants\?/i,
      /single\s+parent\s+rental/i,
      /immigration\s+status/i,
      /are\s+you\s+sure\s+(he|she|they)\s+can\s+afford/i,
      /won't\s+be\s+a\s+problem\s+with\s+foreigners?/i,
      // Racial steering / ethnic preference — Fair Housing Act violation
      /specific\s+ethnic\s+(demographic|area|neighborhood|community)/i,
      /people\s+like\s+(us|ourselves)/i,
      /majority\s+(population|residents?)/i,
      /homogeneous\s+(area|neighborhood|community)/i,
      /certain\s+(background|culture|ethnicity)/i,
      /cultural\s+(fit|background|community)/i,
      /same\s+(background|culture|kind)\s+(people|residents?|families)/i,
      /mostly\s+(white|australian|european)\s+(area|neighborhood|suburb)/i
    ],
    riskLevel: RISK_LEVEL.CRITICAL,
    response: 'HANDOFF_CRITICAL',
    reason: 'Fair Housing violation — racial steering / ethnic preference detected',
    disclaimerRequired: false
  },

  // HIGH — human notification required, AI can continue with disclaimer
  PRICE_PREDICTION: {
    patterns: [
      /price\s+(will|going\s+to)\s+(go\s+up|increase|rise|drop|fall)/i,
      /market\s+will\s+(be\s+)?(higher|lower)/i,
      /next\s+year\s+price/i,
      /valued\s+at\s+\$/i,
      /worth\s+\$/i,
      /appraisal\s+value/i,
      /price\s+guide/i
    ],
    riskLevel: RISK_LEVEL.HIGH,
    response: 'ADD_DISCLAIMER',
    disclaimerType: 'price_prediction',
    reason: 'Price prediction requires qualified valuer',
    disclaimerRequired: true
  },
  RENTAL_LEAD_DISQUALIFICATION: {
    patterns: [
      /income\s+requirement/i,
      /credit\s+score\s+requirement/i,
      /employment\s+requirement/i,
      /can\s+ afford/i,
      /rental\s+history\s+check/i,
      /(will\s+I|can\s+I|am\s+I)\s+(get\s+)?approved\s+(for\s+)?(this\s+)?(rental|property|tenancy)/i,
      /(will\s+I|can\s+I)\s+be\s+(approved|accepted)/i,
      /application\s+(success|approved|accepted|likelihood)/i,
      /what\s+are\s+my\s+chances\s+(of\s+)?(getting\s+)?approved/i
    ],
    riskLevel: RISK_LEVEL.HIGH,
    response: 'ADD_DISCLAIMER',
    disclaimerType: 'rental_criteria',
    reason: 'Rental criteria must be applied consistently per Privacy Act',
    disclaimerRequired: true
  },
  VICTORIA_SPCIFIC: {
    patterns: [
      /section\s+32/i,
      /vendor\s+statement/i,
      /auction\s+terms/i,
      /cooling.?off/i,
      /passed\s+in\s+at\s+auction/i
    ],
    riskLevel: RISK_LEVEL.HIGH,
    response: 'ADD_DISCLAIMER',
    disclaimerType: 'victoria_legal',
    reason: 'Victoria-specific legal requirements',
    disclaimerRequired: true
  },

  // MEDIUM — flag for review, AI can respond
  BUDGET_NEGOTIATION: {
    patterns: [
      /negotiat/i,
      /lower\s+offer/i,
      /below\s+asking/i,
      /counter\s+offer/i,
      /reduce[d]?\s+price/i,
      /mortgage\s+broker/i,
      /home\s+loan/i,
      /finance\s+(brokers?|option|advice)/i
    ],
    riskLevel: RISK_LEVEL.MEDIUM,
    response: 'PROCEED',
    reason: 'General finance query — can provide general info with disclaimer',
    disclaimerRequired: false
  },
  COMPETITOR_MENTION: {
    patterns: [
      /compared\s+to\s+(real\s+)?(estate|agent)/i,
      /other\s+agents?/i,
      /high\s+level/i,
      /competition/i
    ],
    riskLevel: RISK_LEVEL.MEDIUM,
    response: 'FLAG_REVIEW',
    reason: 'Competitor mention — may need agent response',
    disclaimerRequired: false
  },

  // LOW — normal conversation, no special handling needed
  GENERAL_INQUIRY: {
    patterns: [
      /open\s+inspection/i,
      /when\s+can\s+i\s+(visit|see|inspect)/i,
      /property\s+details/i,
      /features?/i,
      /bedroom[s]?\s+(size|number)/i,
      /bathroom[s]?/i,
      /parking/i,
      /price\s+details/i
    ],
    riskLevel: RISK_LEVEL.LOW,
    response: 'PROCEED',
    reason: 'Standard property inquiry',
    disclaimerRequired: false
  }
};

/**
 * Score a message for risk level
 * @param {string} message - The incoming message
 * @returns {object} { riskLevel, trigger, action, requiresDisclaimer }
 */
function scoreMessage(message) {
  let highestRisk = RISK_LEVEL.LOW;
  let matchedTrigger = null;

  for (const [key, trigger] of Object.entries(ESCALATION_TRIGGERS)) {
    for (const pattern of trigger.patterns) {
      if (pattern.test(message)) {
        if (trigger.riskLevel > highestRisk) {
          highestRisk = trigger.riskLevel;
          matchedTrigger = { key, ...trigger };
        }
        break;
      }
    }
  }

  return {
    riskLevel: highestRisk,
    trigger: matchedTrigger?.key || null,
    action: matchedTrigger?.response || 'PROCEED',
    reason: matchedTrigger?.reason || 'Standard inquiry',
    requiresDisclaimer: matchedTrigger?.disclaimerRequired || false,
    disclaimerType: matchedTrigger?.disclaimerType || null
  };
}

/**
 * Determine escalation action based on risk score
 * @param {object} scoreResult - Result from scoreMessage()
 * @returns {string} escalation action
 */
function determineEscalation(scoreResult) {
  switch (scoreResult.action) {
    case 'HANDOFF_CRITICAL':
      return 'HANDOFF_IMMEDIATE';
    case 'ADD_DISCLAIMER':
      return 'PROCEED_WITH_DISCLAIMER';
    case 'FLAG_REVIEW':
      return 'PROCEED_FLAGGED';
    default:
      return 'PROCEED';
  }
}

/**
 * Build a handoff notification for human agent
 * @param {object} params
 * @returns {object} notification payload
 */
function buildHandoffNotification({ leadId, conversationId, riskLevel, trigger, reason, message, context }) {
  return {
    type: 'AGENT_NOTIFICATION',
    priority: riskLevel >= RISK_LEVEL.HIGH ? 'URGENT' : 'NORMAL',
    timestamp: new Date().toISOString(),
    lead: leadId,
    conversation: conversationId,
    risk: {
      level: riskLevel,
      trigger,
      reason
    },
    originalMessage: message,
    context,
    suggestedAction: riskLevel >= RISK_LEVEL.CRITICAL ? 'HANDOFF_IMMEDIATE' : 'REVIEW_LATER',
    aiResponse: 'I\'ve flagged this for my human colleague to follow up with you directly. They\'ll be in touch shortly.'
  };
}

module.exports = {
  RISK_LEVEL,
  ESCALATION_TRIGGERS,
  scoreMessage,
  determineEscalation,
  buildHandoffNotification
};