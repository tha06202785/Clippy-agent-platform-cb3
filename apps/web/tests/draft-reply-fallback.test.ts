import { describe, expect, it } from "vitest";
import { createSafeDraftFallback, enforceFirstPersonAgentVoice } from "../src/lib/ai/draft-reply-fallback";

describe("safe draft fallback", () => {
  it("uses details already supplied without promising a call", () => {
    const reply = createSafeDraftFallback({
      clientName: "Email Sender",
      agentName: "Teddy Thamel",
      latestClientMessage: "Hi, I’m James Taylor. I’m interested in 12 Test Street and would like an inspection this Saturday. Please contact me on 0412 345 678.",
    });

    expect(reply).toContain("Hi James,");
    expect(reply).toContain("12 Test Street");
    expect(reply).toContain("for Saturday");
    expect(reply).toContain("Teddy Thamel");
    expect(reply).not.toMatch(/confirm the exact address|call you/i);
  });

  it("converts third-person agent wording to first person", () => {
    expect(
      enforceFirstPersonAgentVoice(
        "Teddy will check the inspection options. Teddy can contact you soon.",
        "Teddy Thamel",
      ),
    ).toBe("I will check the inspection options. I can contact you soon.");
  });
});
