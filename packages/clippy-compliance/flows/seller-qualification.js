/**
 * Seller Qualification Flow — Clippy AI Copilot
 * State machine for compliant seller lead qualification
 */

const FLOW_STATES = {
  INITIAL: 'initial',
  INTENT_DETECTED: 'intent_detected',
  PROPERTY_ASSESSMENT: 'property_assessment',
  TIMELINE_CAPTURED: 'timeline_captured',
  MOTIVATION_CAPTURED: 'motivation_captured',
  VALUATION_READY: 'valuation_ready',
  CRM_SAVE: 'crm_save',
  HOT_LEAD_CHECK: 'hot_lead_check',
  RESPONDING: 'responding',
  COMPLETE: 'complete'
};

const QUALIFYING_QUESTIONS = [
  {
    key: 'property_address',
    question: 'What is the address of the property you\'d like to sell?',
    required: true,
    stateTransition: FLOW_STATES.PROPERTY_ASSESSMENT,
    privacyNote: 'Your address will only be used to arrange a property appraisal and will not be shared publicly.'
  },
  {
    key: 'property_type',
    question: 'What type of property is it?',
    options: ['House', 'Unit/Apartment', 'Townhouse', 'Villa', 'Land', 'Commercial', 'Other'],
    required: true,
    stateTransition: FLOW_STATES.PROPERTY_ASSESSMENT
  },
  {
    key: 'ownership',
    question: 'How long have you owned the property?',
    options: ['Under 1 year', '1–3 years', '3–7 years', '7+ years', 'Prefer not to say'],
    required: false,
    stateTransition: FLOW_STATES.TIMELINE_CAPTURED
  },
  {
    key: 'timeline',
    question: 'When are you looking to sell?',
    options: ['As soon as possible', 'Within 3 months', '3–6 months', 'Just researching'],
    required: true,
    stateTransition: FLOW_STATES.TIMELINE_CAPTURED
  },
  {
    key: 'motivation',
    question: 'What\'s motivating the sale? (You don\'t need to share details if you\'d prefer not to)',
    options: ['Upgrading', 'Downsizing', 'Relocating', 'Financial reasons', 'Investment decision', 'Prefer not to say'],
    required: false,
    stateTransition: FLOW_STATES.MOTIVATION_CAPTURED
  },
  {
    key: 'agent_status',
    question: 'Have you had the property valued or listed with an agent before?',
    options: ['Yes, previously valued', 'Yes, previously listed', 'No, first time', 'Currently comparing agents'],
    required: false,
    stateTransition: FLOW_STATES.HOT_LEAD_CHECK
  }
];

const HOT_LEAD_INDICATORS = [
  { key: 'timeline', values: ['As soon as possible', 'Within 3 months'], score: 30 },
  { key: 'motivation', values: ['Financial reasons', 'Relocating'], score: 20 },
  { key: 'property_type', values: [], score: 10 },
  { key: 'agent_status', values: ['No, first time', 'Currently comparing agents'], score: 15 },
  { key: 'ownership', values: ['Under 1 year', '1–3 years'], score: 10 }
];

const HOT_LEAD_THRESHOLD = 45;
const CRM_LEAD_STATUS = { NEW: 'new', QUALIFIED: 'qualified', HOT: 'hot', CONVERTED: 'converted', LOST: 'lost' };

function evaluateSellerInquiry(message, context = {}) {
  const lc = message.toLowerCase();
  const currentState = context.currentState || FLOW_STATES.INITIAL;

  const intentSignals = [
    /sell(ing)?\s+(my\s+)?(property|house|home|unit)/i,
    /want\s+(to\s+)?(sell|list)\s+(my\s+)?(property|house)/i,
    /interested\s+(in|for)\s+(selling|listing)/i,
    /property\s+(for\s+)?sale/i,
    /looking\s+(to|for)\s+(sell|list)\s+(my|a)/i,
    /get\s+(my\s+)?(property|home)\s+(valued|appraised)/i,
    /market\s+(appraisal|valuation)/i
  ];

  if (currentState === FLOW_STATES.INITIAL) {
    for (const signal of intentSignals) {
      if (signal.test(lc)) {
        return {
          nextState: FLOW_STATES.INTENT_DETECTED,
          extractedData: { intent: 'seller' },
          response: buildSellerGreetingResponse(message, context),
          isComplete: false
        };
      }
    }
  }

  return { nextState: currentState, extractedData: {}, response: null, isComplete: false };
}

function buildSellerGreetingResponse(message, context) {
  const firstName = context.firstName || 'there';
  return `Hi ${firstName}, thanks for reaching out about selling your property — that's a great step!\n\nTo help you get started, what's the address of the property? Even just the suburb and postcode to begin with is fine. We're happy to arrange a no-obligation market appraisal for you.`;
}

function calculateSellerHotLeadScore(data) {
  let score = 0;
  const factors = [];
  for (const ind of HOT_LEAD_INDICATORS) {
    const val = data[ind.key];
    if (!val) continue;
    if (ind.values.length === 0 || ind.values.includes(val)) {
      score += ind.score;
      factors.push(`${ind.key}=${val} (+${ind.score})`);
    }
  }
  return { score, isHot: score >= HOT_LEAD_THRESHOLD, factors };
}

function buildSellerCrmPayload(data, platform = 'whatsapp') {
  const hotScore = calculateSellerHotLeadScore(data);
  return {
    lead_type: 'seller',
    status: hotScore.isHot ? CRM_LEAD_STATUS.HOT : CRM_LEAD_STATUS.QUALIFIED,
    priority: hotScore.isHot ? 'high' : 'normal',
    hot_lead_score: hotScore.score,
    hot_lead_factors: hotScore.factors,
    platform,
    property_address: data.property_address || null,
    property_type: data.property_type || null,
    ownership_duration: data.ownership || null,
    timeline: data.timeline || null,
    motivation: data.motivation || null,
    agent_status: data.agent_status || null,
    first_contact: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

function getNextSellerQuestion(captured) {
  for (const q of QUALIFYING_QUESTIONS) {
    if (q.required && !captured[q.key]) return { question: q, isComplete: false };
  }
  return { question: null, isComplete: true };
}

module.exports = {
  FLOW_STATES,
  QUALIFYING_QUESTIONS,
  HOT_LEAD_THRESHOLD,
  evaluateSellerInquiry,
  calculateSellerHotLeadScore,
  buildSellerCrmPayload,
  getNextSellerQuestion
};