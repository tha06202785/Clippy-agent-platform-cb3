/**
 * Disclaimer Engine — Clippy AI Copilot
 * Auto-inserts legally-required disclaimers by topic for Australian real estate
 */

const DISCLAIMER_TEMPLATES = {
  price_prediction: {
    topic: 'Price/Value Predictions',
    triggerKeywords: ['price', 'value', 'worth', 'increase', 'go up', 'rise', 'drop', 'fall', 'appraisal', 'market', '$', 'asking price', 'offer below', 'below asking', 'listed at', 'selling for', 'worth'],
    templates: [
      'Please note: Any price indications or market predictions provided are general in nature and should not be relied upon as financial or investment advice. For accurate property valuations, please consult a qualified independent valuer. {{AGENT_NAME}} from {{AGENCY_NAME}} is happy to arrange a complimentary market appraisal.',
      'Disclaimer: Property values can fluctuate based on many factors including market conditions, property improvements, and broader economic trends. I recommend seeking independent professional advice before making any financial decisions regarding property purchase or investment.'
    ],
    insertMode: 'append',
    platformOverrides: {
      whatsapp: 'Please note: Price indications are general only — for an accurate property valuation, please consult a qualified valuer. {{AGENT_NAME}} is happy to help arrange this! 📋',
      sms: 'Price indications are general only — for a formal valuation, please consult a qualified valuer. {{AGENT_NAME}} can assist.'
    }
  },

  financial_advice: {
    topic: 'Financial/Investment Advice',
    triggerKeywords: ['invest', 'return', 'roi', 'capital gain', 'profit', 'yield', 'financial', 'money'],
    templates: [
      'Important: This response is general in nature and does not constitute financial or investment advice. For personalised financial guidance regarding property, please consult a qualified financial adviser or your accountant. {{AGENT_NAME}} at {{AGENCY_NAME}} can provide general market information but is not a licensed financial adviser.'
    ],
    insertMode: 'prefix',
    platformOverrides: {
      whatsapp: '⚠️ This is general info only — for financial advice specific to your situation, please consult a qualified financial adviser. Happy to share general market info!',
      sms: 'General info only — consult a financial adviser for personal advice. {{AGENT_NAME}} can help with market info.'
    }
  },

  legal_advice: {
    topic: 'Legal Interpretation',
    triggerKeywords: ['contract', 'legal', ' clause', 'obligation', 'rights', 'breach', 'law', 'act', 'section'],
    templates: [
      'Please be advised: I am an AI assistant and not a qualified legal practitioner. This information is general in nature and should not be taken as legal advice. For advice specific to your circumstances, please consult a qualified Australian solicitor or legal service. Organisations such as LawAccess NSW, Consumer Affairs Victoria, or the Queensland Law Society can provide assistance.'
    ],
    insertMode: 'prefix',
    platformOverrides: {
      whatsapp: '⚠️ I\'m not a lawyer — for legal advice please consult a qualified solicitor. Consumer Affairs or LawAccess can help with general queries.',
      sms: 'Not legal advice — please consult a qualified solicitor for your specific situation.'
    }
  },

  rental_criteria: {
    topic: 'Rental Application Criteria',
    triggerKeywords: ['income', 'credit', 'employment', 'rental history', 'requirement', 'criteria', 'tenant selection'],
    templates: [
      'Please note: Tenant selection criteria are applied consistently to all applicants in accordance with anti-discrimination laws including the Fair Housing Act 1988 (NSW), Residential Tenancies Act 1997 (VIC), and the Anti-Discrimination Act 1991 (QLD). All applications are assessed on their individual merits. For questions about specific criteria, please speak with {{AGENT_NAME}} at {{AGENCY_NAME}}.'
    ],
    insertMode: 'append',
    platformOverrides: {
      whatsapp: 'Note: All rental applications are assessed consistently per anti-discrimination law. {{AGENT_NAME}} is happy to discuss criteria.',
      sms: 'Rental criteria applied per anti-discrimination law — {{AGENT_NAME}} can discuss specifics.'
    }
  },

  victoria_legal: {
    topic: 'Victoria-Specific Legal Requirements',
    triggerKeywords: ['section 32', 'vendor statement', 'auction', 'cooling off', 'passed in'],
    templates: [
      'Victoria specific: Section 32 (Vendor Statement) requirements mean sellers must disclose certain information before a contract is signed. Auction terms in Victoria differ from other states — all bids are binding and there is no cooling-off period for auction properties. Passed-in properties may be negotiated directly with the vendor. {{AGENT_NAME}} can explain these in detail.'
    ],
    insertMode: 'append',
    platformOverrides: {
      whatsapp: '📍 VIC law: Auction sales are unconditional (no cooling-off). Section 32 disclosure is required before signing. {{AGENT_NAME}} is happy to explain!',
      sms: 'VIC: Auction sales = unconditional, no cooling-off. Section 32 required before contract. {{AGENT_NAME}} can explain.'
    }
  },

  nsw_specific: {
    topic: 'NSW-Specific Legal Requirements',
    triggerKeywords: ['section 66', 'cooling off', 'auction', 'non-resident'],
    templates: [
      'NSW specific: Residential property auctions in NSW have a 5-business-day cooling-off period (unless exchanged at auction). Foreign investors may face additional restrictions under the Foreign Acquisitions and Takeovers Act 1975. {{AGENT_NAME}} can advise further.'
    ],
    insertMode: 'append',
    platformOverrides: {
      whatsapp: '📍 NSW: 5-day cooling-off on residential auctions. {{AGENT_NAME}} is happy to explain!',
      sms: 'NSW: 5-day cooling-off on residential auctions. {{AGENT_NAME}} can advise.'
    }
  },

  general_disclaimer: {
    topic: 'General Communication Disclaimer',
    triggerKeywords: [],
    templates: [
      'This conversation is with {{AGENT_NAME}} at {{AGENCY_NAME}}. While I aim to be helpful, please note this is AI-assisted communication and does not replace professional advice. For your specific circumstances, please consult the appropriate qualified professional.'
    ],
    insertMode: 'append',
    platformOverrides: {
      whatsapp: '🤖 AI-assisted reply from {{AGENT_NAME}} at {{AGENCY_NAME}} — for specific advice, please consult a professional.',
      sms: 'AI-assisted reply from {{AGENCY_NAME}}. For specific advice, please consult a professional.'
    }
  }
};

/**
 * Detect which disclaimer types apply to a message
 * @param {string} message
 * @returns {string[]} array of matching disclaimer type keys
 */
function detectDisclaimerTypes(message) {
  const matched = [];
  for (const [key, config] of Object.entries(DISCLAIMER_TEMPLATES)) {
    if (key === 'general_disclaimer') continue; // Always added separately
    for (const keyword of config.triggerKeywords) {
      if (message.toLowerCase().includes(keyword.toLowerCase())) {
        matched.push(key);
        break;
      }
    }
  }
  return matched;
}

/**
 * Get the appropriate disclaimer text for a platform
 * @param {string} disclaimerType
 * @param {string} platform
 * @param {object} replacements - { AGENCY_NAME, AGENT_NAME, etc. }
 * @returns {string}
 */
function getDisclaimerText(disclaimerType, platform, replacements = {}) {
  const config = DISCLAIMER_TEMPLATES[disclaimerType];
  if (!config) return '';

  let text;

  // Platform-specific override if available
  if (config.platformOverrides && config.platformOverrides[platform]) {
    text = config.platformOverrides[platform];
  } else {
    // Use first template (most complete)
    text = config.templates[0];
  }

  // Replace placeholders
  for (const [key, value] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), value || key);
  }

  return text;
}

/**
 * Insert disclaimer into response based on mode
 * @param {string} response - The AI-generated response
 * @param {string} disclaimer - The disclaimer text
 * @param {string} mode - 'prefix' or 'append'
 * @returns {string}
 */
function insertDisclaimer(response, disclaimer, mode = 'append') {
  if (mode === 'prefix') {
    return `${disclaimer}\n\n${response}`;
  }
  return `${response}\n\n${disclaimer}`;
}

/**
 * Process a full AI response — detect needed disclaimers and insert them
 * @param {object} params
 * @returns {string} processed response with appropriate disclaimers
 */
function processResponse({ response, message, platform = 'whatsapp', replacements = {} }) {
  const disclaimerTypes = detectDisclaimerTypes(message);
  const disclaimerTypes2 = detectDisclaimerTypes(response);

  // Combine and dedupe
  const allTypes = [...new Set([...disclaimerTypes, ...disclaimerTypes2])];

  let processedResponse = response;

  for (const type of allTypes) {
    const disclaimer = getDisclaimerText(type, platform, replacements);
    const config = DISCLAIMER_TEMPLATES[type];
    if (disclaimer && config) {
      processedResponse = insertDisclaimer(processedResponse, disclaimer, config.insertMode);
    }
  }

  // Always add general disclaimer last if response is substantive
  if (processedResponse.length > 100 && !allTypes.includes('general_disclaimer')) {
    const general = getDisclaimerText('general_disclaimer', platform, replacements);
    processedResponse = insertDisclaimer(processedResponse, general, 'append');
  }

  return processedResponse;
}

module.exports = {
  DISCLAIMER_TEMPLATES,
  detectDisclaimerTypes,
  getDisclaimerText,
  insertDisclaimer,
  processResponse
};