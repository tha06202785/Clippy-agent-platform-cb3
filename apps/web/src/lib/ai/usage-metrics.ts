type UsageEvent = {
  status?: string | null;
  latency_ms?: number | null;
  created_at?: string | null;
};

const DAY_MS = 86_400_000;

export function calculateRecentAIReliability(
  events: UsageEvent[],
  now = new Date(),
  windowDays = 7,
) {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  const recentEvents = events.filter((event) => {
    const createdAt = new Date(event.created_at || "").getTime();
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
  const failedEvents = recentEvents.filter(
    (event) => event.status === "error",
  );
  const successfulEvents = recentEvents.filter(
    (event) => event.status === "success",
  );
  const lastFailureAt = failedEvents.reduce<string | null>((latest, event) => {
    const createdAt = event.created_at || null;
    if (!createdAt) return latest;
    return !latest || createdAt > latest ? createdAt : latest;
  }, null);

  return {
    recentWindowDays: windowDays,
    recentRequests: recentEvents.length,
    recentFailedRequests: failedEvents.length,
    recentErrorRate: recentEvents.length
      ? Math.round((failedEvents.length / recentEvents.length) * 1_000) / 10
      : null,
    recentAverageLatencyMs: successfulEvents.length
      ? Math.round(
          successfulEvents.reduce(
            (sum, event) => sum + Number(event.latency_ms || 0),
            0,
          ) / successfulEvents.length,
        )
      : null,
    lastFailureAt,
  };
}
