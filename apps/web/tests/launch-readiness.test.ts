import { describe, expect, it } from "vitest";
import { buildLaunchReadiness } from "@/lib/launch-readiness";

const empty = {
  profileComplete: false,
  crmSelected: false,
  importComplete: false,
  knowledgeCount: 0,
  connectedChannels: 0,
  clientCount: 0,
  propertyCount: 0,
  approvedDraftCount: 0,
  calendarConnected: false,
  reminderCount: 0,
};

describe("pilot launch readiness", () => {
  it("requires verified outcomes rather than setup intentions", () => {
    const result = buildLaunchReadiness({
      ...empty,
      crmSelected: true,
      calendarConnected: true,
    });

    expect(result.score).toBe(0);
    expect(result.steps.find((step) => step.key === "crm")?.complete).toBe(false);
    expect(result.steps.find((step) => step.key === "calendar")?.complete).toBe(false);
  });

  it("reports a complete pilot workspace at 100 percent", () => {
    const result = buildLaunchReadiness({
      profileComplete: true,
      crmSelected: true,
      importComplete: true,
      knowledgeCount: 1,
      connectedChannels: 1,
      clientCount: 1,
      propertyCount: 1,
      approvedDraftCount: 1,
      calendarConnected: true,
      reminderCount: 1,
    });

    expect(result.completed).toBe(8);
    expect(result.score).toBe(100);
  });
});
