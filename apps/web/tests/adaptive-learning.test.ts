import { describe, expect, it } from "vitest";
import {
  classifyCommunicationSituation,
  deriveAgentStyleProfile,
  inferClientCommunicationPreferences,
  sanitiseCommunicationText,
} from "@/lib/adaptive-learning";

describe("adaptive communication privacy", () => {
  it("redacts client, contact and transaction identifiers before storage", () => {
    const result = sanitiseCommunicationText(
      `Hi Ira,

Thanks for asking about 12 Twat Street, Footscray 3011. The guide is $800,000. Call 0412 345 678 or email agent@example.com before 14/08/2026 at 11:30 am. Details: https://example.com/listing

Kind regards,
Tharanga`,
      { names: ["Ira", "Tharanga"] },
    );

    expect(result).toContain("Hi [client]");
    expect(result).toContain("[property]");
    expect(result).toContain("[amount]");
    expect(result).toContain("[phone]");
    expect(result).toContain("[email]");
    expect(result).toContain("[link]");
    expect(result).toContain("[date]");
    expect(result).toContain("[time]");
    expect(result).toContain("[postcode]");
    expect(result).toContain("[agent]");
    expect(result).not.toContain("Ira");
    expect(result).not.toContain("Tharanga");
    expect(result).not.toContain("Twat Street");
  });

  it("removes quoted reply history", () => {
    const result = sanitiseCommunicationText(
      "Thanks, I’ll confirm that shortly.\n\nOn Tuesday, Client wrote:\nPrivate old thread",
    );
    expect(result).toBe("Thanks, I’ll confirm that shortly.");
  });
});

describe("Agent DNA derivation", () => {
  it("derives stable, explainable style rules from sent examples", () => {
    const profile = deriveAgentStyleProfile([
      "Hi [client],\n\nThanks for the update! I’ll check and come back to you shortly.\n\nKind regards,\n[agent]",
      "Hi [client],\n\nThanks, that works well. I’ll send the confirmation today.\n\nKind regards,\n[agent]",
      "Hello [client],\n\nI appreciate the note. Would tomorrow suit?\n\nKind regards,\n[agent]",
    ]);

    expect(profile.sampleCount).toBe(3);
    expect(profile.averageWords).toBeGreaterThan(5);
    expect(profile.greetings[0]).toBe("Hi [client]");
    expect(profile.signoffs[0]).toBe("kind regards");
    expect(profile.rules.explicit).toEqual([]);
    expect(profile.summary).toContain("voice");
  });

  it("keeps explicit rules in the resulting profile", () => {
    const profile = deriveAgentStyleProfile(
      ["Thanks, I’ll check."],
      ["End inspection replies with one clear next step."],
    );
    expect(profile.rules.explicit).toEqual([
      "End inspection replies with one clear next step.",
    ]);
  });
});

describe("client preference evidence", () => {
  it("records only explicit multi-dimensional preferences", () => {
    const result = inferClientCommunicationPreferences(
      "Please text me and keep it brief. Please remind me tomorrow.",
    );
    expect(result.channel).toBe("sms");
    expect(result.length).toBe("brief");
    expect(result.reminders).toBe("reminders_welcome");
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it("does not guess a preference from ordinary conversation", () => {
    const result = inferClientCommunicationPreferences(
      "Thanks, I am interested in viewing the property this weekend.",
    );
    expect(result).toEqual({ confidence: 0 });
  });
});

describe("communication situations", () => {
  it("classifies common real-estate communication scenarios", () => {
    expect(
      classifyCommunicationSituation(
        "Inspection confirmation",
        "Your inspection booking is confirmed.",
      ),
    ).toBe("inspection_confirmation");
    expect(
      classifyCommunicationSituation("Offer", "Let’s discuss the offer price"),
    ).toBe("offer_negotiation");
    expect(
      classifyCommunicationSituation("", "Just following up after our call"),
    ).toBe("follow_up");
  });
});
