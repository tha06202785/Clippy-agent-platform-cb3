import { describe, expect, it } from "vitest";
import { calculateRecentAIReliability } from "../src/lib/ai/usage-metrics";

describe("AI reliability metrics", () => {
  const now = new Date("2026-08-22T00:00:00.000Z");

  it("keeps old failures out of the current reliability window", () => {
    expect(
      calculateRecentAIReliability(
        [
          {
            status: "error",
            latency_ms: 30_000,
            created_at: "2026-08-12T00:00:00.000Z",
          },
          {
            status: "success",
            latency_ms: 12_000,
            created_at: "2026-08-20T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toMatchObject({
      recentRequests: 1,
      recentFailedRequests: 0,
      recentErrorRate: 0,
      recentAverageLatencyMs: 12_000,
      lastFailureAt: null,
    });
  });

  it("reports no samples honestly and excludes blocked replies from latency", () => {
    expect(calculateRecentAIReliability([], now)).toMatchObject({
      recentRequests: 0,
      recentErrorRate: null,
      recentAverageLatencyMs: null,
    });

    expect(
      calculateRecentAIReliability(
        [
          {
            status: "success",
            latency_ms: 8_000,
            created_at: "2026-08-21T00:00:00.000Z",
          },
          {
            status: "blocked",
            latency_ms: 18_000,
            created_at: "2026-08-21T01:00:00.000Z",
          },
          {
            status: "error",
            latency_ms: 30_000,
            created_at: "2026-08-21T02:00:00.000Z",
          },
        ],
        now,
      ),
    ).toMatchObject({
      recentRequests: 3,
      recentFailedRequests: 1,
      recentErrorRate: 33.3,
      recentAverageLatencyMs: 8_000,
      lastFailureAt: "2026-08-21T02:00:00.000Z",
    });
  });
});
