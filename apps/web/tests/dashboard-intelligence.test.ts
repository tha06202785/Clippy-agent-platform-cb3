import { describe, expect, it } from "vitest";
import {
  buildDashboardRecommendations,
  calculateMessagePerformance,
  getDashboardWindow,
} from "@/lib/dashboard-intelligence";

describe("dashboard intelligence", () => {
  it("calculates response evidence within each conversation", () => {
    const performance = calculateMessagePerformance([
      {
        conversation_id: "conversation-a",
        role: "lead",
        created_at: "2026-07-29T00:00:00.000Z",
      },
      {
        conversation_id: "conversation-b",
        role: "lead",
        created_at: "2026-07-29T00:00:02.000Z",
      },
      {
        conversation_id: "conversation-a",
        role: "ai",
        created_at: "2026-07-29T00:00:10.000Z",
        external_message_id: "external-1",
      },
      {
        conversation_id: "conversation-b",
        role: "agent",
        created_at: "2026-07-29T00:00:22.000Z",
      },
    ]);

    expect(performance).toEqual({
      inbound_bursts: 2,
      answered_bursts: 2,
      outbound_messages_recorded: 2,
      outbound_messages_with_external_id: 1,
      avg_response_time_seconds: 15,
      response_coverage_percent: 100,
    });
  });

  it("does not call an AI draft delivered without external evidence", () => {
    const performance = calculateMessagePerformance([
      {
        conversation_id: "conversation-a",
        role: "lead",
        created_at: "2026-07-29T00:00:00.000Z",
      },
      {
        conversation_id: "conversation-a",
        role: "ai",
        created_at: "2026-07-29T00:00:05.000Z",
        external_message_id: null,
      },
    ]);

    expect(performance.outbound_messages_recorded).toBe(1);
    expect(performance.outbound_messages_with_external_id).toBe(0);
  });

  it("prioritises unresolved exceptions before general work", () => {
    const recommendations = buildDashboardRecommendations({
      tasks: [
        {
          id: "task-due",
          type: "follow_up",
          title: "Call Alex about the appraisal",
          due_at: "2026-07-29T08:00:00.000Z",
          lead_id: "lead-2",
          lead_name: "Alex Morgan",
        },
        {
          id: "task-urgent",
          type: "urgent_follow_up",
          title: "Reply to Jordan",
          due_at: "2026-07-29T10:00:00.000Z",
          lead_id: "lead-3",
          listing_id: "listing-1",
          lead_name: "Jordan Smith",
          property_address: "25 Collins Street, Melbourne",
        },
      ],
      hotLeads: [
        { id: "lead-1", full_name: "Sam Lee", ai_score: 91, stage: "hot" },
      ],
      newLeadsToday: 4,
      now: new Date("2026-07-29T09:00:00.000Z"),
    });

    expect(recommendations.map((item) => item.kind)).toEqual([
      "urgent_task",
      "due_task",
      "hot_lead",
    ]);
    expect(recommendations[2]).toMatchObject({
      title: "Contact Sam Lee",
      action: "Draft first contact",
    });
    expect(recommendations[0]).toMatchObject({
      title: "Reply to Jordan",
      detail: "Jordan Smith · 25 Collins Street, Melbourne · Due in 1h",
      action: "Draft follow-up",
      task_id: "task-urgent",
    });
    const launch = new URL(recommendations[0].href, "https://useclippy.com");
    expect(launch.searchParams.get("launch")).toBe("follow_up");
    expect(launch.searchParams.get("task_id")).toBe("task-urgent");
    expect(launch.searchParams.get("lead_id")).toBe("lead-3");
    expect(launch.searchParams.get("listing_id")).toBe("listing-1");
  });

  it("does not duplicate a hot lead already represented by a task", () => {
    const recommendations = buildDashboardRecommendations({
      tasks: [
        {
          id: "task-1",
          title: "Call Sam",
          lead_id: "lead-1",
          due_at: "2026-07-29T08:00:00.000Z",
        },
      ],
      hotLeads: [
        { id: "lead-1", full_name: "Sam Lee", ai_score: 91, stage: "hot" },
      ],
      newLeadsToday: 0,
      now: new Date("2026-07-29T09:00:00.000Z"),
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].task_id).toBe("task-1");
  });

  it("uses the Melbourne reporting day", () => {
    const window = getDashboardWindow(new Date("2026-07-28T22:30:00.000Z"));

    expect(window.today.toISOString()).toBe("2026-07-28T14:00:00.000Z");
  });
});
