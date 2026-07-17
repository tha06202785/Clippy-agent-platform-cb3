/**
 * Inspection Follow-Up Flow — Clippy AI Copilot
 * Post-inspection follow-up with compliant feedback capture
 */

const FLOW_STATES = {
  INITIAL: 'initial',
  INSPECTION_CONFIRMED: 'inspection_confirmed',
  FEEDBACK_CAPTURED: 'feedback_captured',
  INTEREST_ASSESSED: 'interest_assessed',
  NEXT_STEPS: 'next_steps',
  OFFER_DISCUSSION: 'offer_discussion',
  CRM_SAVE: 'crm_save',
  COMPLETE: 'complete'
};

const FEEDBACK_QUESTIONS = [
  {
    key: 'overall_impression',
    question: 'How did you feel about the property overall?',
    options: ['Very interested', 'Somewhat interested', 'Need to think about it', 'Not for me'],
    required: true,
    stateTransition: FLOW_STATES.INTEREST_ASSESSED
  },
  {
    key: 'key_features_liked',
    question: 'What did you like most about the property?',
    options: ['Location', 'Layout/Space', 'Condition', 'Price', 'Views/Aspect', 'Outdoor area', 'Multiple things'],
    required: false,
    stateTransition: FLOW_STATES.FEEDBACK_CAPTURED,
    multiSelect: true
  },
  {
    key: 'concerns',
    question: 'Is there anything that concern you about the property?',
    options: ['Price too high', 'Needs work/renovation', 'Location', 'Size/Layout', 'Nothing major', 'Prefer not to say'],
    required: false,
    stateTransition: FLOW_STATES.NEXT_STEPS,
    multiSelect: true
  },
  {
    key: 'timeline',
    question: 'Are you ready to take the next step?',
    options: ['Want to make an offer', 'Would like to negotiate', 'Need to discuss with partner/family', 'Just browsing'],
    required: false,
    stateTransition: FLOW_STATES.OFFER_DISCUSSION
  }
];

function evaluateInspectionFollowup(message, context = {}) {
  const lc = message.toLowerCase();
  const currentState = context.currentState || FLOW_STATES.INITIAL;

  const inspectionSignals = [
    /inspect(ion|ed)?\s+(the\s+)?(property|house|unit)/i,
    /went\s+(to\s+)?(the\s+)?(open\s+)?inspection/i,
    /viewed?\s+(the\s+)?(property|house)/i,
    /saw\s+(the\s+)?(property|house)/i,
    /open\s+house/i,
    /property\s+viewing/i,
    /visited?\s+(the\s+)?(property|home)/i
  ];

  if (currentState === FLOW_STATES.INITIAL) {
    for (const signal of inspectionSignals) {
      if (signal.test(lc)) {
        return {
          nextState: FLOW_STATES.INSPECTION_CONFIRMED,
          extractedData: { attended_inspection: true, property_address: context.property_address },
          response: buildInspectionFollowupResponse(message, context),
          isComplete: false
        };
      }
    }
  }

  return { nextState: currentState, extractedData: {}, response: null, isComplete: false };
}

function buildInspectionFollowupResponse(message, context) {
  const firstName = context.firstName || 'there';
  return `Hi ${firstName}, great to see you at the inspection! I'd love to hear your thoughts.\n\nWhat did you think of the property overall?`;
}

function calculateFollowupHotLeadScore(data) {
  let score = 0;
  const factors = [];

  if (data.overall_impression === 'Very interested') score += 40;
  else if (data.overall_impression === 'Somewhat interested') score += 20;

  if (data.timeline === 'Want to make an offer') score += 30;
  else if (data.timeline === 'Would like to negotiate') score += 25;

  if (data.concerns === 'Nothing major' || data.concerns === 'Price too high') score += 15;
  if (data.concerns && data.concerns.includes('Price too high')) score += 10; // Budget negotiation signal

  return {
    score,
    isHot: score >= 60,
    factors
  };
}

function buildFollowupCrmPayload(data, context = {}) {
  const hotScore = calculateFollowupHotLeadScore(data);
  return {
    lead_type: 'inspection_followup',
    status: hotScore.isHot ? 'hot' : 'qualified',
    priority: hotScore.isHot ? 'high' : 'normal',
    hot_lead_score: hotScore.score,
    attended_inspection: data.attended_inspection || false,
    property_address: context.property_address || null,
    overall_impression: data.overall_impression || null,
    key_features_liked: data.key_features_liked || null,
    concerns: data.concerns || null,
    timeline: data.timeline || null,
    inspection_date: context.inspection_date || null,
    first_contact: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

module.exports = {
  FLOW_STATES,
  FEEDBACK_QUESTIONS,
  evaluateInspectionFollowup,
  calculateFollowupHotLeadScore,
  buildFollowupCrmPayload
};