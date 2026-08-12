export type CalendarConflict = {
  id: string;
  startsAt: string;
  endsAt: string;
  source: "clippy" | "google";
  title?: string | null;
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

export function findGoogleCalendarConflicts(
  documents: CalendarDocument[],
  startsAt: string,
  endsAt: string,
): CalendarConflict[] {
  const requestedStart = new Date(startsAt).getTime();
  const requestedEnd = new Date(endsAt).getTime();
  if (!Number.isFinite(requestedStart) || !Number.isFinite(requestedEnd)) return [];

  return documents.flatMap((document) => {
    const eventStart = metadataText(document.source_metadata, "starts_at");
    const eventEnd = metadataText(document.source_metadata, "ends_at");
    if (!eventStart || !eventEnd) return [];
    const start = new Date(eventStart).getTime();
    const end = new Date(eventEnd).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
    if (start >= requestedEnd || end <= requestedStart) return [];
    return [{
      id: document.id,
      startsAt: eventStart,
      endsAt: eventEnd,
      source: "google" as const,
      title: document.title || "Google Calendar event",
    }];
  });
}
