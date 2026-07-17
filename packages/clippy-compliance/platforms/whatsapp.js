/**
 * WhatsApp Platform Handler — Clippy AI Copilot
 */

const PLATFORM_CONFIG = {
  maxLength: 4096,           // WhatsApp text limit
  maxPerMessage: 1600,       // Keep individual messages readable
  emojiAllowed: true,
  linksAllowed: true,
  tone: 'friendly',
  responseStyle: 'conversational',
  multiMessageAllowed: true,
  typingIndicator: true
};

const TONE_GUIDANCE = {
  greeting: 'Hey {{first_name}}! 👋 Great to hear from you.',
  greetingFormal: 'Hi {{first_name}}, hope you\'re well.',
  closing: 'Let me know if you need anything else! 😊',
  escalation: '{{AGENT_NAME}} has been notified and will reach out to you directly. 🙏',
  apology: 'No worries at all — let me check on that for you.',
  hold: 'Give me just a sec... 🔍'
};

const REPLY_TEMPLATES = {
  propertyInquiry: [
    'Thanks for your interest! What would you like to know about the property?',
    'Great question! {{SHORT_ANSWER}} — want me to send you more details?'
  ],
  viewingRequest: [
    'Yes! When are you free? {{AGENT_NAME}} can arrange a time that works for you.',
    'For sure! {{SUGGESTED_TIME}} — does that work?'
  ],
  priceQuery: [
    'The property is listed at {{PRICE}}. Happy to chat through the details!',
    'It\'s priced at {{PRICE}} — let me know if you\'d like to know more!'
  ],
  renterInquiry: [
    'Great enquiry! When are you hoping to move in?'
  ],
  quickReply: [
    '👍',
    'Thanks!',
    'Got it!',
    'Perfect, I\'ll pass that on!'
  ]
};

/**
 * Format response for WhatsApp — conversational, emoji-friendly, within length limit
 * @param {string} text
 * @param {object} context
 * @returns {string|string[]}
 */
function formatResponse(text, context = {}) {
  const platform = 'whatsapp';

  // Replace placeholders
  let formatted = text
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'the team')
    .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || '')
    .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || 'the property')
    .replace(/{{first_name}}/g, context.firstName || 'there')
    .replace(/{{PRICE}}/g, context.PRICE || '')
    .replace(/{{SUGGESTED_TIME}}/g, context.SUGGESTED_TIME || 'let me know your availability');

  // Split long messages into multiple WhatsApp-friendly messages
  if (formatted.length > PLATFORM_CONFIG.maxPerMessage) {
    const chunks = splitMessage(formatted, PLATFORM_CONFIG.maxPerMessage);
    return chunks;
  }

  return formatted;
}

/**
 * Split a long message into chunks of maxSize, breaking on sentences
 * @param {string} text
 * @param {number} maxSize
 * @returns {string[]}
 */
function splitMessage(text, maxSize) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > maxSize) {
    let splitAt = remaining.lastIndexOf('\n', maxSize);
    if (splitAt < maxSize / 2) splitAt = remaining.lastIndexOf('. ', maxSize);
    if (splitAt < maxSize / 2) splitAt = maxSize;

    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Build a WhatsApp list message (if supported by business API)
 * @param {object} params
 * @returns {object}
 */
function buildListMessage({ header, body, footer, buttons }) {
  return {
    type: 'list',
    header: { type: 'text', text: header },
    body: { text: body },
    footer: { text: footer },
    action: {
      buttons: buttons.map(btn => ({
        type: 'reply',
        reply: { title: btn.title, id: btn.id || btn.title.toLowerCase().replace(/\s+/g, '_') }
      }))
    }
  };
}

/**
 * Build a WhatsApp interactive CTA button
 * @param {string} body
 * @param {string} buttonText
 * @param {string} url
 * @returns {object}
 */
function buildCtaButton(body, buttonText, url) {
  return {
    type: 'cta',
    body: { text: body },
    action: { url }
  };
}

/**
 * Format lead notification for WhatsApp agent alert
 * @param {object} leadData
 * @returns {string}
 */
function formatLeadNotification(leadData) {
  const time = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
  let msg = `📩 *New WhatsApp lead*\n`;
  msg += `Name: ${leadData.name || 'Unknown'}\n`;
  if (leadData.phone) msg += `Phone: ${leadData.phone}\n`;
  msg += `Interest: ${leadData.interest || 'General'}\n`;
  if (leadData.message) msg += `Message: ${leadData.message.substring(0, 100)}\n`;
  msg += `Time: ${time}`;
  if (leadData.isHot) msg += `\n🔥 *HOT LEAD*`;
  return msg;
}

module.exports = {
  PLATFORM_CONFIG,
  TONE_GUIDANCE,
  REPLY_TEMPLATES,
  formatResponse,
  splitMessage,
  buildListMessage,
  buildCtaButton,
  formatLeadNotification
};