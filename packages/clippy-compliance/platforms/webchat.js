/**
 * Webchat Platform Handler — Clippy AI Copilot
 */

const PLATFORM_CONFIG = {
  maxLength: 1000,
  tone: 'professional',
  responseStyle: 'helpful',
  emojiAllowed: true,
  linksAllowed: true,
  typingIndicator: true,
  welcomeMessage: 'Hi! Welcome to {{AGENCY_NAME}}. I\'m here to help you find property information, book inspections, or get answers to your questions. What can I help you with today?'
};

const TONE_GUIDANCE = {
  greeting: 'Hello {{first_name}}, welcome! How can I help you today?',
  closing: 'Is there anything else I can help you with?',
  escalation: 'I\'ve passed your question to {{AGENT_NAME}} and they\'ll be in touch shortly.',
  apology: 'Thanks for your patience — I\'m looking into that for you now.',
  hold: 'One moment please while I pull that up for you...'
};

function formatResponse(text, context = {}) {
  let formatted = text;
  if (formatted.length > PLATFORM_CONFIG.maxLength) {
    formatted = formatted.substring(0, PLATFORM_CONFIG.maxLength - 3) + '...';
  }
  return formatted
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'the team')
    .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || 'our agency')
    .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || 'this property')
    .replace(/{{first_name}}/g, context.firstName || '');
}

module.exports = {
  PLATFORM_CONFIG,
  TONE_GUIDANCE,
  formatResponse
};