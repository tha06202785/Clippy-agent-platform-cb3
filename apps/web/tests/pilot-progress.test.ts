import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPilotProgress,
  isConnectedIntegrationStatus,
} from "@/lib/pilot-progress";

const emptySignals = {
  confirmedDnaSections: 0,
  gmailConnected: false,
  calendarConnected: false,
  clientCount: 0,
  propertyCount: 0,
  approvedReplyCount: 0,
  feedbackCount: 0,
};

describe("pilot progress", () => {
  it("builds an automatic six-step checklist from real usage signals", () => {
    const progress = buildPilotProgress(emptySignals);

    expect(progress.total).toBe(6);
    expect(progress.completed).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.steps.map((step) => step.href)).toEqual([
      "/learning",
      "/integrations",
      "/integrations",
      "/import",
      "/properties",
      "/copilot",
    ]);
  });

  it("requires all ten Agent DNA sections and completes from evidence", () => {
    const progress = buildPilotProgress({
      confirmedDnaSections: 10,
      gmailConnected: true,
      calendarConnected: true,
      clientCount: 12,
      propertyCount: 3,
      approvedReplyCount: 1,
      feedbackCount: 4,
    });

    expect(progress.completed).toBe(6);
    expect(progress.percent).toBe(100);
    expect(progress.feedbackCount).toBe(4);
    expect(progress.steps.every((step) => step.complete)).toBe(true);
  });

  it("recognises only healthy connected integration states", () => {
    expect(isConnectedIntegrationStatus("connected")).toBe(true);
    expect(isConnectedIntegrationStatus("healthy")).toBe(true);
    expect(isConnectedIntegrationStatus("error")).toBe(false);
  });
});

describe("pilot feedback privacy", () => {
  it("keeps feedback server-only and does not store draft text", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/20260828091117_pilot_feedback.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "alter table public.pilot_feedback enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.pilot_feedback from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant all on table public.pilot_feedback to service_role",
    );
    expect(migration).not.toMatch(/draft_(content|text)/);
  });
});
