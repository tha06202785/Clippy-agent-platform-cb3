/**
 * Email Platform Handler — Clippy AI Copilot
 */

const PLATFORM_CONFIG = {
  maxLength: 2000,          // Email body — generous
  subjectRequired: true,
  tone: 'professional',
  responseStyle: 'formal',
  emojiAllowed: false,
  signatureRequired: true
};

const TONE_GUIDANCE = {
  greeting: 'Dear {{first_name}},',
  greetingFormal: 'Dear {{first_name}},',
  closing: 'Please don\'t hesitate to get in touch if you have any other questions. I\'m happy to help.',
  closingFormal: 'I look forward to hearing from you and remain available to discuss any queries.',
  escalation: 'I\'ve escalated your query to {{AGENT_NAME}} at {{AGENCY_NAME}} who will follow up directly.',
  apology: 'Thank you for bringing this to my attention. I\'m looking into it now and will respond shortly.'
};

const REPLY_TEMPLATES = {
  inquiry: {
    subject: 'Re: Your property enquiry — {{PROPERTY_ADDRESS}}',
    body: 'Thank you for your enquiry about {{PROPERTY_ADDRESS}}. I\'m happy to provide the following information:\n\n{{ANSWER}}\n\nPlease let me know if you have any other questions.'
  },
  viewing: {
    subject: 'Arranging a property inspection — {{PROPERTY_ADDRESS}}',
    body: 'Thank you for your interest in {{PROPERTY_ADDRESS}}.\n\nI\'d be delighted to arrange an inspection for you. {{AGENT_NAME}} is available at the following times:\n\n{{AVAILABLE_TIMES}}\n\nPlease let us know which time suits you best and we\'ll confirm the appointment.'
  },
  appraisal: {
    subject: 'Market appraisal — {{PROPERTY_ADDRESS}}',
    body: 'Thank you for your enquiry about a market appraisal for {{PROPERTY_ADDRESS}}.\n\n{{AGENCY_NAME}} offers complimentary market appraisals for homeowners. To arrange yours, simply reply to confirm the property address and your preferred contact details.\n\nKind regards,\n{{AGENT_NAME}}\n{{AGENCY_NAME}}'
  }
};

/**
 * Format response for email — formal, includes subject, no emoji
 * @param {string} body
 * @param {object} context
 * @returns {{ subject: string, body: string, footer: string }}
 */
function formatResponse(body, context = {}) {
  const subject = buildSubject(context.subjectTemplate, context);
  const footer = buildEmailFooter(context);

  return {
    subject,
    body: body.replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'The Team')
      .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || '')
      .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || 'the property'),
    footer
  };
}

/**
 * Build email subject line
 * @param {string} template
 * @param {object} context
 * @returns {string}
 */
function buildSubject(template, context = {}) {
  if (!template) return 'Thank you for your enquiry';
  return template
    .replace(/{{PROPERTY_ADDRESS}}/g, context.PROPERTY_ADDRESS || '')
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || '')
    .replace(/{{first_name}}/g, context.firstName || '');
}

/**
 * Build email footer/signature
 * @param {object} context
 * @returns {string}
 */
function buildEmailFooter(context = {}) {
  return `\n\nKind regards,\n${context.AGENT_NAME || '{{AGENT_NAME}}'}\n${context.AGENCY_NAME || '{{AGENCY_NAME}}'}\n${context.AGENT_PHONE || ''}\n${context.AGENT_EMAIL || ''}`;
}

/**
 * Auto-generate subject from message content
 * @param {string} message
 * @param {object} context
 * @returns {string}
 */
function autoSubject(message, context = {}) {
  const lc = message.toLowerCase();
  if (/inspect|viewing|see\s+the\s+property/i.test(lc)) return 'Re: Property inspection enquiry';
  if (/price|cost|how\s+much/i.test(lc)) return 'Re: Property pricing enquiry';
  if (/rent(ing)?|tenant/i.test(lc)) return 'Re: Rental enquiry';
  if (/sell|list|appraisal/i.test(lc)) return 'Re: Property enquiry';
  return 'Re: Your enquiry';
}

module.exports = {
  PLATFORM_CONFIG,
  TONE_GUIDANCE,
  REPLY_TEMPLATES,
  formatResponse,
  buildSubject,
  buildEmailFooter,
  autoSubject
};