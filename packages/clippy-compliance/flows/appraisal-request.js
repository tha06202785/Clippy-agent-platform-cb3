/**
 * Appraisal Request Flow — Clippy AI Copilot
 * Handles property appraisal requests compliantly
 */

const FLOW_STATES = {
  INITIAL: 'initial',
  REQUEST_DETECTED: 'request_detected',
  PROPERTY_CAPTURED: 'property_captured',
  OWNER_VERIFICATION: 'owner_verification',
  TIMELINE_CAPTURED: 'timeline_captured',
  CRM_SAVE: 'crm_save',
  COMPLETE: 'complete'
};

function evaluateAppraisalRequest(message, context = {}) {
  const lc = message.toLowerCase();
  const currentState = context.currentState || FLOW_STATES.INITIAL;

  const appraisalSignals = [
    /apprais(e|al|ing)\s+(my\s+)?(property|house|home)/i,
    /valu(e|ation|ing)\s+(my\s+)?(property|house|home)/i,
    /market\s+(appraisal|estimate|valuation)/i,
    /how\s+much\s+(is|would|could)\s+(my\s+)?(property|house|home)\s+(worth|valued)/i,
    /what\s+(would|could)\s+(my\s+)?(property|house)\s+(sell\s+for|be\s+worth)/i,
    /free\s+(appraisal|valuation|estimate)/i,
    /get\s+(my\s+)?(property|house)\s+(valued|appraised|estimated)/i
  ];

  if (currentState === FLOW_STATES.INITIAL) {
    for (const signal of appraisalSignals) {
      if (signal.test(lc)) {
        return {
          nextState: FLOW_STATES.REQUEST_DETECTED,
          extractedData: { request_type: 'appraisal' },
          response: buildAppraisalResponse(message, context),
          isComplete: false
        };
      }
    }
  }

  return { nextState: currentState, extractedData: {}, response: null, isComplete: false };
}

function buildAppraisalResponse(message, context) {
  const firstName = context.firstName || 'there';
  return `Hi ${firstName}, happy to help with a property appraisal! Just to confirm — are you the owner of the property?\n\nThis helps us understand whether we can proceed with a full market appraisal for you.`;
}

function buildOwnerVerificationResponse(context) {
  return `Thanks! To arrange a proper market appraisal, we'll need:\n\n• The property address (or at least suburb/postcode)\n• Some basic property details (beds/baths/type)\n• Photos if available (interior/exterior)\n\nWe offer a complimentary market appraisal as a service to homeowners. A formal appraisal will include comparable sales analysis and current market conditions. Would you like to proceed?`;
}

function buildAppraisalCrmPayload(data, platform = 'whatsapp') {
  return {
    lead_type: 'appraisal_request',
    status: 'qualified',
    priority: data.timeline === 'As soon as possible' ? 'high' : 'normal',
    platform,
    property_address: data.property_address || null,
    property_type: data.property_type || null,
    bedrooms: data.bedrooms || null,
    bathrooms: data.bathrooms || null,
    owner_verified: data.owner_verified || false,
    timeline: data.timeline || null,
    first_contact: new Date().toISOString(),
    last_updated: new Date().toISOString()
  };
}

module.exports = {
  FLOW_STATES,
  evaluateAppraisalRequest,
  buildOwnerVerificationResponse,
  buildAppraisalCrmPayload
};