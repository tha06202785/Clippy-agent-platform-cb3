/**
 * Content Filter — Clippy AI Copilot
 * Filters risky/non-compliant wording, replaces with safe alternatives
 */

const BLOCKED_PATTERNS = [
  // Misleading price promises
  { pattern: /\bwill\s+(definitely|guaranteed?)\s+(go\s+up|increase|rise|appreciate)\b/i, risk: 'CRITICAL', replacement: 'may increase over time' },
  { pattern: /\bguaranteed\s+(return|profit|appreciation)\b/i, risk: 'CRITICAL', replacement: 'potential return' },
  { pattern: /\bprice\s+will\s+(definitely|certainly|surely)\s+(go\s+up|rise|increase)\b/i, risk: 'CRITICAL', replacement: 'price may increase' },
  { pattern: /\bno\s+risk\s+(property|investment)\b/i, risk: 'CRITICAL', replacement: 'all investments carry some risk' },
  { pattern: /\bsafe\s+(investment|property)\b/i, risk: 'CRITICAL', replacement: 'property investment with various factors to consider' },

  // False promises
  { pattern: /\bwe\s+(promise|guarantee)\s+(to\s+)?(.+)/i, risk: 'CRITICAL', replacement: 'we aim to' },
  { pattern: /\babsolutely\s+(the\s+)?best\b/i, risk: 'HIGH', replacement: 'among the best options' },
  { pattern: /\bonly\s+\$[\d,]+/i, risk: 'HIGH', replacement: null }, // Capture for review — do not autofix
  { pattern: /\bbest\s+deal\s+in\s+(town|australia|the\s+market)\b/i, risk: 'HIGH', replacement: 'competitive pricing' },

  // Discriminatory language
  { pattern: /\b(good|kideal|nice)\s+(tenant|renter|buyer)\b(?!\s+(people|applicants))/i, risk: 'CRITICAL', replacement: 'qualified applicant' },
  { pattern: /\bno\s+(dogs?|cats?|pets?)\s+(allowed|permitted|welcome)\b/i, risk: 'HIGH', replacement: 'pet policy can be discussed with the landlord' },
  { pattern: /\bforeigners?\s+(welcome|not\s+welcome|accepted)\b/i, risk: 'CRITICAL', replacement: 'all applicants welcome to apply' },
  { pattern: /\b(typical|average)\s+(australian|local)\s+(family|couple)\b/i, risk: 'CRITICAL', replacement: 'prospective buyers' },

  // Financial advice (too specific)
  { pattern: /\byou\s+should\s+invest\s+in\s+(this|that|property)\b/i, risk: 'CRITICAL', replacement: 'this property may suit buyers looking for specific features' },
  { pattern: /\b(tell|advise)\s+(me|you|us)\s+how\s+to\s+(invest|make\s+money)\b/i, risk: 'CRITICAL', replacement: null }, // Flag for handoff
  { pattern: /\bbest\s+(investment|financial)\s+(decision|choice|option)\b/i, risk: 'HIGH', replacement: 'suitable for your circumstances' },

  // Misleading "sold" claims
  { pattern: /\bsold\s+(for|at)\s+\$[\d,]+(?!\s+plus)/i, risk: 'MEDIUM', replacement: null }, // Flag for accuracy check
  { pattern: /\bjust\s+sold\s+(for|at)\s+\$[\d,]+/i, risk: 'MEDIUM', replacement: null }, // Flag for recency check

  // Unlicensed advice
  { pattern: /\b(legal|contractual|law)\s+advice\b/i, risk: 'CRITICAL', replacement: 'general information only — consult a solicitor' },
  { pattern: /\bi\s+(recommend|suggest)\s+(you\s+)?(get\s+a\s+)?lawyer\b/i, risk: 'HIGH', replacement: 'you may wish to seek independent legal advice' },
  { pattern: /\byou\s+(need\s+to|should\s+to)\s+(get\s+)?(a\s+)?lawyer\b/i, risk: 'HIGH', replacement: 'you may wish to seek independent legal advice' },

  // Emotional manipulation
  { pattern: /\b(don't\s+miss\s+out|won't\s+find\s+better|last\s+chance|act\s+now)\b/i, risk: 'MEDIUM', replacement: "we're happy to discuss your options" },
  { pattern: /\beveryone\s+(is\s+buying|loves|wants)\s+this\b/i, risk: 'MEDIUM', replacement: 'this property has attracted strong interest' },

  // Unverified claims
  { pattern: /\b(proud|excited)\s+to\s+(announce|share)\s+(that\s+)?(the|this)\s+property\s+(is|has|will)\b/i, risk: 'MEDIUM', replacement: null }, // Flag for tone check
  { pattern: /\b(renovated|updated)\s+(by\s+(previous|former)\s+owner|owner)\b/i, risk: 'MEDIUM', replacement: null }, // Flag for verification
];

const FLAG_FOR_REVIEW_PATTERNS = [
  /sold\s+for\s+\$[\d,]+/i,
  /renovated\s+by\s+(previous|former)\s+owner/i,
  /only\s+\$[\d,]+/i,
  /best\s+(agent|deal|in\s+town)/i,
  /we promise/i,
  /we guarantee/i,
  /should invest/i,
];

const REPLACEMENTS_MAP = {
  'will definitely go up': 'may increase over time',
  'will surely increase': 'may increase over time',
  'guaranteed return': 'potential return',
  'guaranteed profit': 'potential profit',
  'no risk': 'all investments carry some level of risk',
  'best deal in': 'competitive',
  'absolutely the best': 'among the best',
  'legal advice': 'general information only — please consult a qualified solicitor',
  'contract advice': 'general information — please consult a qualified solicitor',
};

/**
 * Filter and sanitize a message
 * @param {string} text
 * @returns {{ filtered: string, blocked: boolean, flags: string[], riskLevel: string }}
 */
function filterMessage(text) {
  let filtered = text;
  const flags = [];
  let blocked = false;
  let riskLevel = 'LOW';

  // Check blocked patterns
  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(filtered)) {
      if (item.risk === 'CRITICAL') {
        riskLevel = 'CRITICAL';
        if (item.replacement) {
          filtered = filtered.replace(item.pattern, item.replacement);
          flags.push(`REPLACED_CRITICAL: "${item.pattern}" → "${item.replacement}"`);
        } else {
          blocked = true;
          flags.push(`BLOCKED_CRITICAL: "${item.pattern}"`);
        }
      } else if (item.risk === 'HIGH') {
        if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
        if (item.replacement) {
          filtered = filtered.replace(item.pattern, item.replacement);
          flags.push(`REPLACED_HIGH: "${item.pattern}" → "${item.replacement}"`);
        } else {
          flags.push(`FLAGGED_HIGH: "${item.pattern}"`);
        }
      } else {
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
        flags.push(`FLAGGED_MEDIUM: "${item.pattern}"`);
      }
    }
  }

  // Check flag patterns
  for (const pattern of FLAG_FOR_REVIEW_PATTERNS) {
    if (pattern.test(filtered)) {
      flags.push(`FLAG_FOR_REVIEW: "${pattern}"`);
    }
  }

  // Apply generic replacements
  for (const [blocked, safe] of Object.entries(REPLACEMENTS_MAP)) {
    if (filtered.toLowerCase().includes(blocked.toLowerCase())) {
      filtered = filtered.replace(new RegExp(blocked, 'gi'), safe);
    }
  }

  return { filtered, blocked, flags, riskLevel };
}

/**
 * Pre-process AI response before it goes to user
 * @param {string} response
 * @returns {{ safe: string, flags: string[], requiresHandoff: boolean }}
 */
function sanitizeAiResponse(response) {
  const result = filterMessage(response);
  return {
    safe: result.filtered,
    flags: result.flags,
    requiresHandoff: result.riskLevel === 'CRITICAL' && result.blocked
  };
}

module.exports = {
  BLOCKED_PATTERNS,
  FLAG_FOR_REVIEW_PATTERNS,
  filterMessage,
  sanitizeAiResponse
};