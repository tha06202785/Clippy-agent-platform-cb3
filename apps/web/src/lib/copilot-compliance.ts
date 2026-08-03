export type CopilotComplianceIssueCode =
  | "false_action_claim"
  | "price_guarantee"
  | "legal_advice"
  | "discrimination"
  | "pressure_tactic"
  | "prompt_leakage";

export type CopilotComplianceResult = {
  passed: boolean;
  checks: CopilotComplianceIssueCode[];
  safeReply: string | null;
};

const FALSE_ACTION_CLAIM =
  /\b(?:i|we|clippy)\s+(?:have\s+)?(?:sent|emailed|texted|scheduled|booked|updated|saved|added|marked)\b|\b(?:has been|is now)\s+(?:sent|scheduled|booked|updated|saved|marked)\b/i;
const PRICE_GUARANTEE =
  /\b(?:guarantee(?:d)?|certain(?:ly)?|definitely)\b.{0,100}\b(?:sell|sale|price|value|return|profit)\b/i;
const DEFINITIVE_LEGAL_ADVICE =
  /\b(?:you|they|the buyer|the vendor|the tenant|the landlord)\s+(?:are|is)\s+(?:legally\s+)?(?:entitled|required|obliged|allowed)\b|\b(?:you|they)\s+can\s+(?:cancel|terminate|break)\s+(?:the\s+)?(?:contract|lease|agreement)\b/i;
const LEGAL_SAFETY_LANGUAGE =
  /\b(?:independent legal advice|legal advice|solicitor|conveyancer|qualified lawyer|cannot advise|can't advise)\b/i;
const DISCRIMINATION =
  /\b(?:families|children|race|religion|disability|nationality|gender|sex|age|marital status|pregnan(?:t|cy))\b.{0,100}\b(?:should not|must not|do not|don't|cannot|can't|not apply|exclude|only|prefer no)\b|\b(?:exclude|reject|avoid)\b.{0,100}\b(?:families|children|race|religion|disability|nationality|gender|sex|age|pregnan(?:t|cy))\b/i;
const PRESSURE_TACTIC =
  /\b(?:act now|last chance|must sign today|sign immediately|you will miss out|don't miss out|do not miss out)\b/i;
const PROMPT_LEAKAGE =
  /\b(?:SIGNED-IN AGENT CONTEXT|IMPORTANT RULES|CLIENT MEMORY:|AGENT-SELECTED WORKING CONTEXT:)\b/;

export function evaluateCopilotReply(reply: string): CopilotComplianceResult {
  const checks: CopilotComplianceIssueCode[] = [];

  if (FALSE_ACTION_CLAIM.test(reply)) checks.push("false_action_claim");
  if (PRICE_GUARANTEE.test(reply)) checks.push("price_guarantee");
  if (DEFINITIVE_LEGAL_ADVICE.test(reply) && !LEGAL_SAFETY_LANGUAGE.test(reply)) {
    checks.push("legal_advice");
  }
  if (DISCRIMINATION.test(reply)) checks.push("discrimination");
  if (PRESSURE_TACTIC.test(reply)) checks.push("pressure_tactic");
  if (PROMPT_LEAKAGE.test(reply)) checks.push("prompt_leakage");

  if (checks.length === 0) {
    return { passed: true, checks, safeReply: null };
  }

  return {
    passed: false,
    checks,
    safeReply:
      "I’ve withheld that response because it may not meet Clippy’s communication and compliance safeguards. Please review the request or ask me to prepare a compliant alternative for human approval.",
  };
}

