/**
 * Australian Jurisdiction Rules — Clippy AI Copilot
 * Covers AU-VIC (primary), AU-NSW, AU-QLD, AU-ALL
 * Version 1.0 | 2026-05-18
 */

// ─── STATE CODES ─────────────────────────────────────────────────────────
const STATE = {
  VIC: 'VIC',
  NSW: 'NSW',
  QLD: 'QLD',
  SA: 'SA',
  WA: 'WA',
  TAS: 'TAS',
  ACT: 'ACT',
  NT: 'NT'
};

// ─── STATE-SPECIFIC DISCLAIMERS ─────────────────────────────────────────
const STATE_DISCLAIMERS = {
  [STATE.VIC]: {
    auction: 'All offers for properties at auction are subject to the agent\'s and vendor\'s approval. We strongly recommend seeking independent legal and financial advice before bid.',
    section32: 'A Section 32 Statement (Vendor Statement) is required under the Sale of Land Act 1962 (VIC) before a vendor can enter a contract. We recommend reviewing it with your solicitor.',
    coolingOff: 'There is no cooling-off period for properties sold at auction in Victoria. For private treaty sales, a 3 business day cooling-off period applies (unless you elect to waive it).',
    passedIn: 'Passed-in properties may be available for negotiation after auction — speak with the agent about your options.',
    foreignBuyer: 'Foreign investors purchasing Victorian real estate require FIRB (Foreign Investment Review Board) approval. Your solicitor or conveyancer can advise further.'
  },
  [STATE.NSW]: {
    auction: 'Properties in NSW at auction require a 5-business-day cooling-off period (unless you bid and exchange contracts immediately at the auction). We recommend seeking legal advice.',
    section66: 'Section 66 of the Conveyancing Act 1919 (NSW) requires vendors to disclose certain information. Your solicitor can advise on disclosure requirements.',
    foreignBuyer: 'Foreign investors require FIRB approval for purchases in NSW. Additional duties may apply for foreign purchasers.',
    speculation: 'Under the Property Developers Act 2022 (NSW), property developers must not make false or misleading statements about land values.'
  },
  [STATE.QLD]: {
    auction: 'Queensland auction rules differ — there is no cooling-off period for auction sales. All bids are binding.',
    coolingOff: 'A 5 business day cooling-off period applies for off-the-plan purchases in QLD under the Land Sales Act 1984.',
    foreignBuyer: 'Foreign investors require FIRB approval and may pay higher transfer duty (2% surcharge on property duty for foreign acquirers).'
  }
};

// ─── FAIR HOUSING ───────────────────────────────────────────────────────
const FAIR_HOUSING_KEYWORDS = [
  'what type of tenants', 'are there families', 'neighbourhood demographics',
  'is it safe for muslim', 'is it safe for indian', 'is it safe for chinese',
  'good area for immigrants', 'many refugees', 'crime rate by ethnicity',
  'what religion are neighbours', 'family friendly area'
];

const FAIR_HOUSING_RESPONSE = (platform) => {
  const responses = {
    whatsapp: 'I completely understand you\'re researching the area — that\'s a smart part of the process. 😊 I don\'t have demographic data about the area, so I can\'t make that assessment. What I can tell you is the factual amenities: [schools, transport, facilities]. I\'d recommend visiting the area and chatting with your agent — they know the local community and can give you a firsthand perspective. Happy to connect you?',
    sms: 'Demographic data isn\'t something I can speak to. Your agent knows the local area well and can give you a firsthand perspective — want me to connect you?',
    default: 'I completely understand you\'re researching the area — that\'s a smart part of the property search process. I don\'t have demographic data about the area, so I can\'t make that assessment. What I can tell you is the factual amenities in the area — [schools, public transport, community facilities]. I\'d recommend visiting the area yourself and chatting with your agent, who knows the local community and can give you a firsthand perspective. Happy to put you in touch?'
  };
  return responses[platform] || responses.default;
};

// ─── RENTAL APPLICATION RULES ─────────────────────────────────────────
const RENTAL_RULES = {
  canAssess: false,
  reason: 'Rental application outcomes are determined by the landlord or property manager — I cannot predict or assess likelihood of approval.',
  whatToSay: 'I can\'t assess your application likelihood — that\'s for the landlord or property manager to decide based on their criteria. Your agent can walk you through what makes a strong application and help you submit one. Want me to connect you?',
  criteria: [
    'Rental history',
    'References',
    'Income/employment verification',
    'ID verification',
    'Suitability for the property'
  ]
};

// ─── PRICE / VALUE RULES ────────────────────────────────────────────────
const VALUE_RULES = {
  canEstimate: false,
  reason: 'I cannot provide property value estimates — only a qualified valuer or a Comparative Market Analysis (CMA) by a licensed agent can do this accurately.',
  whatToSay: 'I can\'t give you a property value — that takes a proper comparative market analysis. {{AGENT_NAME}} does these for free and can walk you through how your property compares to recent sales. Want me to set that up?'
};

// ─── LEGAL / CONTRACT RULES ────────────────────────────────────────────
const LEGAL_RULES = {
  cannotAdvise: true,
  escalateOn: [
    'should I sign',
    'can you explain this clause',
    'what does the contract say',
    'is this normal in contracts',
    'can you sign on my behalf',
    'is this legal',
    'vendor statement',
    'section 32'
  ],
  whatToSay: 'That\'s a really important question — and the fact that you\'re asking it shows you\'re doing the right thing. I can confirm [relevant fact], but because I can\'t give legal or contractual advice, I\'d actually recommend chatting with {{AGENT_NAME}} or your solicitor specifically about what this means for your situation. I can arrange for your agent to call you today to talk it through — or if you\'d prefer to run it past your solicitor first, that\'s completely reasonable. Want me to set up a time?'
};

// ─── ANTI-DISCRIMINATION CHECK ──────────────────────────────────────────
function checkFairHousing(message) {
  const lc = message.toLowerCase();
  for (const keyword of FAIR_HOUSING_KEYWORDS) {
    if (lc.includes(keyword.toLowerCase())) {
      return {
        isFairHousingRisk: true,
        category: 'demographic_question',
        response: FAIR_HOUSING_RESPONSE
      };
    }
  }
  return { isFairHousingRisk: false };
}

// ─── STATE DETECTION ───────────────────────────────────────────────────
const STATE_PATTERNS = {
  [STATE.VIC]: /\b(vic|victoria|melbourne|geelong|ballarat|bendigo)\b/i,
  [STATE.NSW]: /\b(ns|nsw|sydney|new south wales|newcastle)\b/i,
  [STATE.QLD]: /\b(qld|queensland|brisbane|gold coast|sunshine coast)\b/i,
  [STATE.SA]: /\b(sa|south australia|adelaide)\b/i,
  [STATE.WA]: /\b(wa|western australia|perth)\b/i,
  [STATE.TAS]: /\b(tas|tasmania|hobart|launceston)\b/i,
  [STATE.ACT]: /\b(act|australian capital territory|canberra)\b/i,
  [STATE.NT]: /\b(nt|northern territory|darwin)\b/i
};

function detectState(message) {
  for (const [state, pattern] of Object.entries(STATE_PATTERNS)) {
    if (pattern.test(message)) return state;
  }
  return STATE.VIC; // Default to VIC (primary market)
}

// ─── JURISDICTION CONFIG ────────────────────────────────────────────────
const JURISDICTION_CONFIG = {
  defaultState: STATE.VIC,
  supportedStates: Object.values(STATE),
  privacyLaw: 'Privacy Act 1988 (Cth) + Australian Privacy Principles',
  fairTradingLaw: 'Fair Trading Act 1999 (VIC) / Fair Trading Act 1987 (NSW)',
  consumerLaw: 'Australian Consumer Law (Schedule 2, Competition and Consumer Act 2010)',
  residentialTenancies: {
    [STATE.VIC]: 'Residential Tenancies Act 1997 + Residential Tenancies Reform Act 2023',
    [STATE.NSW]: 'Residential Tenancies Act 2010',
    [STATE.QLD]: 'Residential Tenancies and Rooming Accommodation Act 1994 (QLD)'
  },
  estateAgentsAct: {
    [STATE.VIC]: 'Estate Agents Act 1980 (VIC)'
  },
  antiDiscrimination: [
    'Fair Housing Act 1988 (VIC)',
    'Anti-Discrimination Act 1977 (NSW)',
    'Anti-Discrimination Act 1991 (QLD)'
  ]
};

module.exports = {
  STATE,
  STATE_DISCLAIMERS,
  FAIR_HOUSING_KEYWORDS,
  RENTAL_RULES,
  VALUE_RULES,
  LEGAL_RULES,
  checkFairHousing,
  detectState,
  JURISDICTION_CONFIG
};