/**
 * Rental Inquiry Flow — Clippy AI Copilot
 * Handles rental enquiries with compliant renter vs buyer branching
 */

const FLOW_STATES = {
  INITIAL: 'initial',
  INQUIRY_TYPE_DETECTED: 'inquiry_type_detected',
  RENTER_QUALIFYING: 'renter_qualifying',
  RENTER_TIMELINE: 'renter_timeline',
  RENTER_BUDGET: 'renter_budget',
  RENTER_VEHICLE_CHECK: 'renter_vehicle_check',
  PROPERTY_VIEWED: 'property_viewed',
  APPLICATION_READY: 'application_ready',
  CRM_SAVE: 'crm_save',
  COMPLETE: 'complete'
};

// Anti-discrimination: do NOT ask these questions
const BLOCKED_RENTAL_QUESTIONS = [
  'country of origin', 'citizenship status', 'immigration status',
  'how long in australia', 'permanent resident', 'visa type',
  'racial background', 'religion', 'marital status'
];

function evaluateRentalInquiry(message, context = {}) {
  const lc = message.toLowerCase();
  const currentState = context.currentState || FLOW_STATES.INITIAL;

  const rentalSignals = [
    /rent(ing)?\s+(a\s+)?(property|house|unit|apartment)/i,
    /looking\s+(to\s+)?rent/i,
    /want\s+(to\s+)?rent/i,
    /long.?term\s+lease/i,
    /rental\s+(property|enquiry|inquiry)/i,
    /available\s+(for\s+)?rent/i,
    /when\s+available\s+(to\s+)?move/i,
    /move\s+(in|into)\s+(date|soon|available)/i,
    /tenancy/i
  ];

  if (currentState === FLOW_STATES.INITIAL) {
    for (const signal of rentalSignals) {
      if (signal.test(lc)) {
        return {
          nextState: FLOW_STATES.INQUIRY_TYPE_DETECTED,
          extractedData: { intent: 'renter', inquiry_type: 'rental' },
          response: buildRentalGreetingResponse(message, context),
          isComplete: false
        };
      }
    }
  }

  return { nextState: currentState, extractedData: {}, response: null, isComplete: false };
}

function buildRentalGreetingResponse(message, context) {
  const firstName = context.firstName || 'there';
  return `Hi ${firstName}, great to hear you're interested in renting! I'm happy to help with your enquiry.\n\nWhich property are you looking at, and when were you hoping to move in?`;
}

function getRentalQuestions() {
  return [
    {
      key: 'move_date',
      question: 'When are you looking to move in?',
      options: ['Immediately', 'Within 2 weeks', 'Within 1 month', 'More than 1 month away', 'Flexible'],
      required: true,
      stateTransition: FLOW_STATES.RENTER_TIMELINE
    },
    {
      key: 'lease_length',
      question: 'What lease length are you after?',
      options: ['6 months', '12 months', '12+ months', 'Flexible'],
      required: false,
      stateTransition: FLOW_STATES.RENTER_BUDGET
    },
    {
      key: 'occupants',
      question: 'How many people will be living in the property?',
      options: ['Just me', '2 people', '3–4 people', '5+ people'],
      required: false,
      stateTransition: FLOW_STATES.RENTER_VEHICLE_CHECK,
      complianceNote: 'Answer is optional and used only to match suitable properties'
    },
    {
      key: 'pets',
      question: 'Do you have pets?',
      options: ['No pets', 'Dogs', 'Cats', 'Both dogs and cats', 'Other pets'],
      required: false,
      stateTransition: FLOW_STATES.RENTER_VEHICLE_CHECK,
      complianceNote: 'Pet policies vary by property — we will discuss options with the landlord'
    },
    {
      key: 'vehicle',
      question: 'Do you need parking?',
      options: ['Yes, need parking', 'No parking needed'],
      required: false,
      stateTransition: FLOW_STATES.PROPERTY_VIEWED
    }
  ];
}

function checkBlockedQuestion(text) {
  const lc = text.toLowerCase();
  for (const blocked of BLOCKED_RENTAL_QUESTIONS) {
    if (lc.includes(blocked.toLowerCase())) {
      return {
        blocked: true,
        reason: `This question may relate to protected characteristics under anti-discrimination law`,
        alternative: 'Please speak directly with {{AGENT_NAME}} about your specific circumstances.'
      };
    }
  }
  return { blocked: false };
}

function buildRentalCrmPayload(data, platform = 'whatsapp') {
  return {
    lead_type: 'renter',
    status: 'qualified',
    priority: data.move_date === 'Immediately' ? 'high' : 'normal',
    platform,
    move_date: data.move_date || null,
    lease_length: data.lease_length || null,
    occupants: data.occupants || null,
    pets: data.pets || null,
    parking_required: data.vehicle === 'Yes, need parking' ? true : false,
    first_contact: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

module.exports = {
  FLOW_STATES,
  BLOCKED_RENTAL_QUESTIONS,
  evaluateRentalInquiry,
  getRentalQuestions,
  checkBlockedQuestion,
  buildRentalCrmPayload
};