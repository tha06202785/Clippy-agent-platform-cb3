import { describe, expect, it } from "vitest";
import {
  detectKnowledgeSourceIntent,
  limitKnowledgeContext,
} from "@/lib/rag/embeddings";

describe("knowledge source intent", () => {
  it("detects natural calendar and schedule questions", () => {
    expect(
      detectKnowledgeSourceIntent("What appointments do I have coming up?"),
    ).toEqual({ calendar: true, email: false });
    expect(detectKnowledgeSourceIntent("Show my schedule for this week")).toEqual(
      { calendar: true, email: false },
    );
  });

  it("detects Gmail and combined requests", () => {
    expect(detectKnowledgeSourceIntent("Check my Gmail inbox")).toEqual({
      calendar: false,
      email: true,
    });
    expect(
      detectKnowledgeSourceIntent("Find the email and add it to my calendar"),
    ).toEqual({ calendar: true, email: true });
  });

  it("does not fetch connected sources for unrelated questions", () => {
    expect(detectKnowledgeSourceIntent("Draft a listing description")).toEqual({
      calendar: false,
      email: false,
    });
  });

  it("keeps retrieved knowledge inside the Copilot context budget", () => {
    const context = limitKnowledgeContext(["a".repeat(6_000), "b".repeat(6_000)]);

    expect(context.length).toBeLessThanOrEqual(8_000);
    expect(context.endsWith("…")).toBe(true);
  });
});
