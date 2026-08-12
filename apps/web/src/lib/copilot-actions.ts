export type DraftActionChannel = "email" | "sms" | "whatsapp" | "copy";

export type ProposedDraftAction = {
  id: string;
  type: "message_draft";
  channel: DraftActionChannel;
  title: string;
  subject: string | null;
  content: string;
  recipient: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  requiresApproval: true;
};

export type ProposedInspectionSlotAction = {
  id: string;
  type: "inspection_slot";
  title: string;
  listingId: string;
  propertyAddress: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  inspectionType: "open";
  conflicts: Array<{\n    id: string;\n    startsAt: string;\n    endsAt: string;\n    source: "clippy" | "google";\n    title?: string | null;\n  }>;
  requiresApproval: true;
};

const SLOT_INTENT =
  /\b(create|add|open|publish|schedule|make)\b[\s\S]{0,40}\b(inspection|open[\s-]?home|time\s*slot|slot)\b|\b(inspection|open[\s-]?home|time\s*slot|slot)\b[\s\S]{0,40}\b(create|add|open|publish|schedule|make)\b/i;

export function shouldCreateInspectionSlot(message: string) {
  return SLOT_INTENT.test(message);
}

function melbourneDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday").toLowerCase(),
  };
}

function melbourneOffset(date: Date) {
  return (
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "+10:00"
  );
}

export function parseInspectionSlotRequest(message: string, now = new Date()) {
  if (!shouldCreateInspectionSlot(message)) return null;

  const timeMatch = message.match(
    /\b(?:at\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i,
  );
  if (!timeMatch) return { missing: "time" as const };
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || "0");
  if (hour < 1 || hour > 12 || minute > 59)
    return { missing: "valid_time" as const };
  if (timeMatch[3].toLowerCase() === "pm" && hour !== 12) hour += 12;
  if (timeMatch[3].toLowerCase() === "am" && hour === 12) hour = 0;

  let date: string | null = null;
  const isoDate = message.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const auDate = message.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (isoDate) date = `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  if (auDate)
    date = `${auDate[3]}-${auDate[2].padStart(2, "0")}-${auDate[1].padStart(2, "0")}`;

  const localNow = melbourneDateParts(now);
  if (/\btoday\b/i.test(message)) date = localNow.date;
  if (/\btomorrow\b/i.test(message)) {
    date = melbourneDateParts(new Date(now.getTime() + 86_400_000)).date;
  }

  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const requestedWeekday = weekdays.find((day) =>
    new RegExp(`\\b(?:this\\s+|next\\s+)?${day}\\b`, "i").test(message),
  );
  if (!date && requestedWeekday) {
    const current = weekdays.indexOf(localNow.weekday);
    const target = weekdays.indexOf(requestedWeekday);
    let daysAhead = (target - current + 7) % 7;
    if (daysAhead === 0 || new RegExp(`\\bnext\\s+${requestedWeekday}\\b`, "i").test(message)) {
      daysAhead += 7;
    }
    date = melbourneDateParts(
      new Date(now.getTime() + daysAhead * 86_400_000),
    ).date;
  }
  if (!date) return { missing: "date" as const };

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const approximate = new Date(`${date}T12:00:00Z`);
  const startsAt = new Date(
    `${date}T${hh}:${mm}:00${melbourneOffset(approximate)}`,
  );
  if (Number.isNaN(startsAt.getTime())) return { missing: "valid_date" as const };
  if (startsAt.getTime() <= now.getTime()) return { missing: "future_date" as const };
  return {
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + 30 * 60_000).toISOString(),
  };
}

const DRAFT_INTENT =
  /\b(draft|write|compose|reply|respond|follow[\s-]?up|send)\b|\b(email|e-mail|sms|text|whatsapp)\s+(to|for|him|her|them|the client|client)\b/i;

export function shouldCreateDraftAction(message: string) {
  return DRAFT_INTENT.test(message);
}

export function resolveDraftChannel({
  message,
  conversationChannel,
  email,
  phone,
}: {
  message: string;
  conversationChannel?: string | null;
  email?: string | null;
  phone?: string | null;
}): DraftActionChannel {
  if (/\b(whatsapp)\b/i.test(message)) return phone ? "whatsapp" : "copy";
  if (/\b(sms|text message|text them|text her|text him)\b/i.test(message)) {
    return phone ? "sms" : "copy";
  }
  if (/\b(email|e-mail)\b/i.test(message)) return email ? "email" : "copy";

  const normalised = conversationChannel?.toLowerCase();
  if (normalised === "email" && email) return "email";
  if (["sms", "text"].includes(normalised || "") && phone) return "sms";
  if (normalised === "whatsapp" && phone) return "whatsapp";
  if (email) return "email";
  if (phone) return "sms";
  return "copy";
}

export function buildDraftLaunchUrl(action: ProposedDraftAction) {
  if (action.channel === "email" && action.recipient.email) {
    const params = new URLSearchParams();
    if (action.subject) params.set("subject", action.subject);
    params.set("body", action.content);
    return `mailto:${action.recipient.email}?${params.toString()}`;
  }

  if (action.channel === "sms" && action.recipient.phone) {
    return `sms:${action.recipient.phone}?body=${encodeURIComponent(
      action.content,
    )}`;
  }

  if (action.channel === "whatsapp" && action.recipient.phone) {
    const phone = action.recipient.phone.replace(/[^\d]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(action.content)}`;
  }

  return null;
}
