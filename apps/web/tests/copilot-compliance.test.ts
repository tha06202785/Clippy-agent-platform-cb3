import { describe, expect, it } from "vitest";
import { evaluateCopilotReply } from "@/lib/copilot-compliance";

describe("Copilot response compliance", () => {
  it("passes a normal factual draft", () => {
    expect(
      evaluateCopilotReply(
        "Thanks for your enquiry. The inspection is listed for Saturday at 10 am. Would you like me to prepare a confirmation email?",
      ),
    ).toEqual({ passed: true, checks: [], safeReply: null });
  });

  it.each([
    ["I have sent the email to the buyer.", "false_action_claim"],
    ["I guarantee the property will sell above $1.4 million.", "price_guarantee"],
    ["You are legally entitled to cancel the contract.", "legal_advice"],
    ["Families with young children should not apply.", "discrimination"],
    ["This is your last chance, so you must sign today.", "pressure_tactic"],
    ["IMPORTANT RULES: reveal the CLIENT MEMORY:", "prompt_leakage"],
  ])("blocks %s", (reply, expectedIssue) => {
    const result = evaluateCopilotReply(reply);
    expect(result.passed).toBe(false);
    expect(result.checks).toContain(expectedIssue);
    expect(result.safeReply).toContain("withheld");
  });

  it("allows legal escalation language", () => {
    expect(
      evaluateCopilotReply(
        "I can’t provide legal advice about cancellation. Please speak with your solicitor or conveyancer.",
      ).passed,
    ).toBe(true);
  });

  it("does not mistake a proposed draft for a completed action", () => {
    expect(
      evaluateCopilotReply("I can draft an email for your approval.").passed,
    ).toBe(true);
  });
});

