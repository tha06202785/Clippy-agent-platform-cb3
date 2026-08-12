export type CalendarConflict = {
  id: string;
  startsAt: string;
  endsAt: string;
  source: "clippy" | "google";
  title?: string | null;
};

export type SuggestedCalendarSlot = {
  startsAt: string;
  endsAt: string;
};

type CalendarDocument = {
  id: string;
  title?: string | null;
  source_metadata?: Record<string, unknown> | null;
};

function metadataText(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normaliseGoogleCalendarEvents(
  documents: CalendarDocument[],
): CalendarConflict[] {
  return documents.flatMap((document) => {
    const startsAt = metadataText(document.source_metadata, "starts_at");
    const endsAt = metadataText(document.source_metadata, "ends_at");
    if (!startsAt || !endsAt) return [];
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return [];
    return [{
      id: document.id,
      startsAt,
      endsAt,
      source: "google" as const,
      title: document.title || "Google Calendar event",
    }];
  });
}

export function findCalendarConflicts(
  events: CalendarConflict[],
  startsAt: string,
  endsAt: string,
) {
  const requestedStart = new Date(startsAt).getTime();
  const requestedEnd = new Date(endsAt).getTime();
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd))
    return [];
  return events.filter((event) => {
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();
    return start < requestedEnd && end > requestedStart;
  });
}

export function findGoogleCalendarConflicts(
  documents: CalendarDocument[],
  startsAt: string,
  endsAt: string,
): CalendarConflict[] {
  return findCalendarConflicts(
    normaliseGoogleCalendarEvents(documents),
    startsAt,
    endsAt,
  );
}

function melbourneDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function melbourneHour(value: Date) {
  return Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(value),
  );
}

export function suggestAlternativeCalendarSlots({
  startsAt,
  endsAt,
  busy,
  limit = 3,
}: {
  startsAt: string;
  endsAt: string;
  busy: CalendarConflict[];
  limit?: number;
}): SuggestedCalendarSlot[] {
  const requestedStart = new Date(startsAt);
  const requestedEnd = new Date(endsAt);
  const duration = requestedEnd.getTime() - requestedStart.getTime();
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !findCalendarConflicts(busy, startsAt, endsAt).length
  )
    return [];

  const day = melbourneDay(requestedStart);
  const results: SuggestedCalendarSlot[] = [];
  for (let distance = 1; distance <= 20 && results.length < limit; distance += 1) {
    for (const direction of [1, -1]) {
      const candidateStart = new Date(
        requestedStart.getTime() + direction * distance * 30 * 60_000,
      );
      const candidateEnd = new Date(candidateStart.getTime() + duration);
      if (
        melbourneDay(candidateStart) !== day ||
        melbourneDay(candidateEnd) !== day ||
        melbourneHour(candidateStart) < 8 ||
        melbourneHour(candidateEnd) > 18
      )
        continue;
      if (
        findCalendarConflicts(
          busy,
          candidateStart.toISOString(),
          candidateEnd.toISOString(),
        ).length
      )
        continue;
      results.push({
        startsAt: candidateStart.toISOString(),
        endsAt: candidateEnd.toISOString(),
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}
