/**
 * SMS Platform Handler — Clippy AI Copilot
 * Future-ready SMS handling (via Twilio, MessageBird, etc.)
 */

const PLATFORM_CONFIG = {
  maxLength: 160,           // Standard SMS segment
  emojiAllowed: true,       // Depends on carrier but generally fine
  linksAllowed: false,      // SMS links often flagged — avoid
  tone: 'brief_friendly',
  responseStyle: 'concise',
  multiMessageAllowed: true,
  // Future: MMS for images
};

const TONE_GUIDANCE = {
  greeting: 'Hi {{first_name}}, thanks for reaching out!',
  closing: 'Reply anytime if you have more questions 😊',
  escalation: '{{AGENT_NAME}} has been notified and will call you shortly.',
  appointment: 'Confirmed! {{AGENT_NAME}} will see you at {{PROPERTY_ADDRESS}} on {{DATE}}.',
  viewingConfirmation: 'All set! See you at {{PROPERTY_ADDRESS}} on {{DATE}} at {{TIME}}. Reply to confirm.'
};

function formatResponse(text, context = {}) {
  let formatted = text
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || '')
    .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || '')
    .replace(/{{first_name}}/g, context.firstName || '')
    .replace(/{{DATE}}/g, context.DATE || '')
    .replace(/{{TIME}}/g, context.TIME || '');

  // SMS: truncate if needed, remove URLs if any slipped through
  formatted = formatted.replace(/https?:\/\/[^\s]+/g, '[link removed]');

  if (formatted.length > PLATFORM_CONFIG.maxLength) {
    // Split into multi-part SMS, but try to keep logical chunks
    if (formatted.length > 160 * 3) {
      formatted = formatted.substring(0, 160 * 3 - 10) + '...';
    }
  }

  return formatted;
}

function buildAppointmentConfirmation(context) {
  const template = TONE_GUIDANCE.appointment;
  return formatResponse(template, context);
}

function buildLeadAlert(leadData) {
  const priority = leadData.isHot ? '🔥' : '📩';
  const msg = `${priority} SMS lead: ${leadData.name}`;
  if (leadData.phone) msg += ` | ${leadData.phone}`;
  msg += ` | ${leadData.interest}`;
  if (leadData.isHot) msg += ' | HOT';
  return msg;
}

module.exports = {
  PLATFORM_CONFIG,
  TONE_GUIDANCE,
  formatResponse,
  buildAppointmentConfirmation,
  buildLeadAlert
};