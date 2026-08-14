import { describe, expect, it, vi } from "vitest";
import { recordClippyActivity } from "@/lib/activity-log";

describe("verified activity logging", () => {
  it("records a completed tenant-scoped outcome", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });

    const recorded = await recordClippyActivity(
      { from },
      {
        orgId: "org-1",
        userId: "user-1",
        action: "approved_email_reply_sent",
        category: "communication",
        title: "Approved reply sent",
        completedAt: "2026-08-14T01:00:00.000Z",
      },
    );

    expect(recorded).toBe(true);
    expect(from).toHaveBeenCalledWith("clippy_activity_log");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        user_id: "user-1",
        action: "approved_email_reply_sent",
        completed_at: "2026-08-14T01:00:00.000Z",
      }),
    );
  });

  it("never blocks the completed business action when logging fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const recorded = await recordClippyActivity(
      {
        from: () => ({
          insert: async () => ({ error: { code: "activity_unavailable" } }),
        }),
      },
      {
        orgId: "org-1",
        action: "inspection_booking_completed",
        category: "inspection",
        title: "Inspection booking completed",
      },
    );

    expect(recorded).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
