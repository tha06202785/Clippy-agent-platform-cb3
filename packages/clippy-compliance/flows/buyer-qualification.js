/**
 * Buyer Qualification Flow — Clippy AI Copilot
 * State machine for compliant buyer lead qualification
 */

const FLOW_STATES = {
  INITIAL: 'initial',
  INTENT_DETECTED: 'intent_detected',
  PROPERTY_SPECIFIED: 'property_specified',
  QUALIFYING: 'qualifying',
  BUDGET_CAPTURED: 'budget_captured',
  INTENT_CAPTURED: 'intent_captured',
  HOT_LEAD_CHECK: 'hot_lead_check',
  CRM_SAVE: 'crm_save',
  RESPONDING: 'responding',
  COMPLETE: 'complete'
};

const QUALIFYING_QUESTIONS = [
  {
    key: 'property_type',
    question: 'Are you looking for a house, unit, townhouse, or apartment?',
    options: ['House', 'Unit/Apartment', 'Townhouse', 'Open to all'],
    required: true,
    stateTransition: FLOW_STATES.PROPERTY_SPECIFIED
  },
  {
    key: 'budget',
    question: 'What is your approximate budget or price range?',
    options: ['Under $500k', '$500k–$750k', '$750k–$1M', '$1M–$1.5M', '$1.5M+', 'Flexible'],
    required: true,
    stateTransition: FLOW_STATES.BUDGET_CAPTURED,
    disclaimer: 'Budget information helps us find suitable properties — you can adjust anytime.'
  },
  {
    key: 'timeline',
    question: 'Are you looking to buy immediately, within 3 months, or just browsing?',
    options: ['Ready to buy now', 'Within 3 months', '3–6 months', 'Just browsing'],
    required: true,
    stateTransition: FLOW_STATES.INTENT_CAPTURED
  },
  {
    key: 'financing',
    question: 'Have you secured financing or pre-approval?',
    options: ['Yes, pre-approved', 'In process', 'Not yet', 'Cash buyer', 'Prefer not to say'],
    required: false,
    stateTransition: FLOW_STATES.QUALIFYING
  },
  {
    key: 'location_preference',
    question: 'Any preferred suburbs or areas?',
    options: ['Specific suburb(s)', 'Flexible on location', 'Still deciding'],
    required: false,
    stateTransition: FLOW_STATES.QUALIFYING
  },
  {
    key: 'agent_status',
    question: 'Are you working with another agent already?',
    options: ['Yes', 'No, first time buyer', 'No, switching agents'],
    required: false,
    stateTransition: FLOW_STATES.HOT_LEAD_CHECK
  }
];

const HOT_LEAD_INDICATORS = [
  { key: 'timeline', values: ['Ready to buy now', 'Within 3 months'], score: 30 },
  { key: 'financing', values: ['Yes, pre-approved', 'Cash buyer'], score: 25 },
  { key: 'budget', values: ['$1.5M+', 'Flexible'], score: 20 },
  { key: 'property_type', values: [], score: 10 }, // Any answer scores
  { key: 'agent_status', values: ['No, first time buyer', 'No, switching agents'], score: 10 },
  { key: 'specific_suburb', values: ['Specific suburb(s)'], score: 5 }
];

const HOT_LEAD_THRESHOLD = 50;

const CRM_LEAD_STATUS = {
  NEW: 'new',
  QUALIFIED: 'qualified',
  HOT: 'hot',
  CONVERTED: 'converted',
  LOST: 'lost'
};

/**
 * Evaluate buyer inquiry message and determine flow state transition
 * @param {string} message - Incoming user message
 * @param {object} context - Current conversation context
 * @returns {object} { nextState, extractedData, response, isComplete }
 */
function evaluateBuyerInquiry(message, context = {}) {
  const lc = message.toLowerCase();
  const currentState = context.currentState || FLOW_STATES.INITIAL;
  const captured = context.captured || {};

  // Intent detection
  if (currentState === FLOW_STATES.INITIAL) {
    const intentSignals = [
      /buy(ing)?\s+(a\s+)?(property|house|unit|apartment)/i,
      /look(ing)?\s+(for\s+)?(property|home)/i,
      /interested\s+(in|to\s+(buy|purchase))/i,
      /want\s+(to\s+)?(buy|purchase|view)\s+(a\s+)?(property|home)/i,
      /real\s+estate\s+inquiry/i,
      /property\s+(for\s+)?sale/i
    ];

    for (const signal of intentSignals) {
      if (signal.test(lc)) {
        return {
          nextState: FLOW_STATES.INTENT_DETECTED,
          extractedData: { intent: 'buyer' },
          response: buildGreetingResponse(message, context),
          isComplete: false
        };
      }
    }
  }

  // Extract known info from message
  const extracted = extractQualifyingData(message, captured);

  // Budget extraction
  if (!captured.budget) {
    const budgetMatch = lc.match(/(\$[\d,]+)\s*(k|K|m|M)?|\b(under|below|around)\s+\$?(\d+)\s*(k|kil|m|million)/i);
    if (budgetMatch) {
      extracted.budget = matchBudgetToOption(message);
    }
  }

  // Timeline extraction
  if (!captured.timeline) {
    if (/ready\s+to\s+(buy|go|move)|urgent|immediate/i.test(lc)) extracted.timeline = 'Ready to buy now';
    else if (/3\s+month/i.test(lc)) extracted.timeline = 'Within 3 months';
    else if (/6\s+month|browsing|just\s+look/i.test(lc)) extracted.timeline = 'Just browsing';
  }

  // Property type extraction
  if (!captured.property_type) {
    if (/house|detached/i.test(lc)) extracted.property_type = 'House';
    else if (/unit|apartment/i.test(lc)) extracted.unit = 'Unit/Apartment';
    else if (/townhouse/i.test(lc)) extracted.property_type = 'Townhouse';
  }

  return {
    nextState: currentState,
    extractedData: extracted,
    response: null,
    isComplete: false
  };
}

function buildGreetingResponse(message, context) {
  const firstName = context.firstName || 'there';
  return `Hi ${firstName}! Great to hear you're looking at properties. I'd love to help you find the right fit.\n\nTo get started, are you looking for a house, unit, townhouse, or apartment?`;
}

function extractQualifyingData(message, captured) {
  return {}; // Hook for NLP extraction
}

function matchBudgetToOption(message) {
  const lc = message.toLowerCase();
  if (/under\s+\$[\d]+k|below\s+\$500k|\$[\d]+\s*k/i.test(lc)) return 'Under $500k';
  if (/\$[\d]+k\s*-\s*\$[\d]+k|\$500k.*\$750k/i.test(lc)) return '$500k–$750k';
  if (/\$750k.*\$1m|\$[\d]+k\s*-\s*\$1m/i.test(lc)) return '$750k–$1M';
  if (/\$1m.*\$1\.5m|\$[\d]+k\s*-\s*\$1\.5m/i.test(lc)) return '$1M–$1.5M';
  if (/\$1\.5m|over\s+\$1m|above\s+\$1m/i.test(lc)) return '$1.5M+';
  if (/flexible|broad|couple\s+million/i.test(lc)) return 'Flexible';
  return null;
}

/**
 * Calculate hot lead score
 * @param {object} qualificationData
 * @returns {{ score: number, isHot: boolean, factors: string[] }}
 */
function calculateHotLeadScore(qualificationData) {
  let score = 0;
  const factors = [];

  for (const indicator of HOT_LEAD_INDICATORS) {
    const value = qualificationData[indicator.key];
    if (!value) continue;

    if (indicator.values.length === 0 || indicator.values.includes(value)) {
      score += indicator.score;
      factors.push(`${indicator.key}=${value} (+${indicator.score})`);
    }
  }

  return {
    score,
    isHot: score >= HOT_LEAD_THRESHOLD,
    factors
  };
}

/**
 * Build CRM payload from qualification data
 * @param {object} qualificationData
 * @param {string} platform
 * @returns {object} CRM-ready payload
 */
function buildCrmPayload(qualificationData, platform = 'whatsapp') {
  const hotScore = calculateHotLeadScore(qualificationData);

  return {
    lead_type: 'buyer',
    status: hotScore.isHot ? CRM_LEAD_STATUS.HOT : CRM_LEAD_STATUS.QUALIFIED,
    priority: hotScore.isHot ? 'high' : 'normal',
    hot_lead_score: hotScore.score,
    hot_lead_factors: hotScore.factors,
    platform,
    property_interest: qualificationData.property_type || null,
    budget: qualificationData.budget || null,
    timeline: qualificationData.timeline || null,
    financing: qualificationData.financing || null,
    location_preference: qualificationData.location_preference || null,
    agent_status: qualificationData.agent_status || null,
    first_contact: qualificationData.first_contact || new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

/**
 * Get next qualifying question based on what's captured
 * @param {object} captured
 * @returns {{ question: object|null, isComplete: boolean }}
 */
function getNextQuestion(captured) {
  for (const q of QUALIFYING_QUESTIONS) {
    if (q.required && !captured[q.key]) {
      return { question: q, isComplete: false };
    }
  }
  return { question: null, isComplete: true };
}

module.exports = {
  FLOW_STATES,
  QUALIFYING_QUESTIONS,
  HOT_LEAD_THRESHOLD,
  CRM_LEAD_STATUS,
  evaluateBuyerInquiry,
  calculateHotLeadScore,
  buildCrmPayload,
  getNextQuestion
};