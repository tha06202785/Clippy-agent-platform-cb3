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
      urgentTasks: 2,
      dueTasks: 1,
      hotLeads: [
        { id: "lead-1", full_name: "Sam Lee", ai_score: 91, stage: "hot" },
      ],
      pendingInspectionTasks: 3,
      newLeadsToday: 4,
    });

    expect(recommendations.map((item) => item.kind)).toEqual([
      "urgent_task",
      "due_task",
      "hot_lead",
    ]);
    expect(recommendations[2].title).toBe("Contact Sam Lee");
  });

  it("uses the Melbourne reporting day", () => {
    const window = getDashboardWindow(
      new Date("2026-07-28T22:30:00.000Z"),
    );

    expect(window.today.toISOString()).toBe("2026-07-28T14:00:00.000Z");
  });
});
