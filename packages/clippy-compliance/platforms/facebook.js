/**
 * Facebook Messenger Platform Handler — Clippy AI Copilot
 */

// Facebook-specific constraints
const PLATFORM_CONFIG = {
  maxLength: 500,           // FB messages cap around 640 chars but keep it safe
  typingDelay: 1500,        // ms to wait before "typing" indicator
  emojiAllowed: true,
  linksAllowed: true,
  multiMessageAllowed: true,
  tone: 'friendly_professional',
  responseStyle: 'conversational'
};

const TONE_GUIDANCE = {
  greeting: 'Hi {{first_name}}! Great to connect with you on Facebook.',
  closing: 'Feel free to send me a message anytime if you have more questions — happy to help!',
  escalation: 'I\'ve sent a notification to my colleague {{AGENT_NAME}} and they\'ll be in touch shortly.',
  apology: 'I appreciate your patience — let me find out for you.',
  hold: 'Just a moment while I pull that up for you...'
};

const REPLY_TEMPLATES = {
  propertyInquiry: [
    'Thanks for your interest in {{PROPERTY_ADDRESS}}! Happy to help — what would you like to know?',
    'Great question about this property! {{ANSWER}}. Anything else you\'d like to explore?'
  ],
  viewingRequest: [
    'Absolutely, we can arrange a viewing! {{AVAILABLE_TIMES}}. What works for you?',
    'For sure — {{AGENT_NAME}} can show you through. Would {{SUGGESTED_TIME}} suit?'
  ],
  priceQuery: [
    'This property is priced at {{PRICE}} — happy to share more details or arrange a chat with {{AGENT_NAME}}.'
  ],
  renterInquiry: [
    'Great enquiry! To help match you with the right property, when were you hoping to move in?'
  ]
};

/**
 * Format response for Facebook — keeps it conversational, uses emoji, within length limit
 * @param {string} text
 * @param {object} context
 * @returns {string}
 */
function formatResponse(text, context = {}) {
  const platform = 'facebook';

  // Trim to length limit
  let formatted = text.length > PLATFORM_CONFIG.maxLength
    ? text.substring(0, PLATFORM_CONFIG.maxLength - 3) + '...'
    : text;

  // Replace placeholders
  formatted = formatted
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'the team')
    .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || 'our team')
    .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || 'this property')
    .replace(/{{first_name}}/g, context.firstName || 'there');

  return formatted;
}

/**
 * Build quick replies for Facebook (if supported)
 * @param {string[]} options
 * @returns {array}
 */
function buildQuickReplies(options) {
  return options.map(opt => ({
    content_type: 'text',
    title: opt.substring(0, 20),
    payload: opt.toLowerCase().replace(/\s+/g, '_')
  }));
}

/**
 * Build a Facebook list response (vertical list template)
 * @param {object} params
 * @returns {object} Facebook API payload
 */
function buildListResponse({ header, elements, buttons }) {
  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'list',
        top_element_style: 'compact',
        header: {
          type: 'text',
          text: header
        },
        elements: elements.map(el => ({
          title: el.title,
          subtitle: el.subtitle,
          image_url: el.image_url,
          default_action: el.action || null,
          buttons: el.buttons || []
        })),
        buttons
      }
    }
  };
}

/**
 * Generate Facebook-specific lead notification
 * @param {object} leadData
 * @returns {string}
 */
function formatLeadNotification(leadData) {
  return `📩 New Facebook lead\n` +
    `Name: ${leadData.name}\n` +
    `Interest: ${leadData.interest}\n` +
    `Source: Facebook\n` +
    `Time: ${new Date().toLocaleString('en-AU')}`;
}

module.exports = {
  PLATFORM_CONFIG,
  TONE_GUIDANCE,
  REPLY_TEMPLATES,
  formatResponse,
  buildQuickReplies,
  buildListResponse,
  formatLeadNotification
};