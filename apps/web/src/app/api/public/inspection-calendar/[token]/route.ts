import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) {
    return NextResponse.json(
      { error: "Calendar link is invalid" },
      { status: 404 },
    );
  }
  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("inspection_bookings")
    .select(
      "id,booking_status,inspection_time_slots(starts_at,ends_at,address),listings(address)",
    )
    .eq("client_calendar_token", token)
    .eq("booking_status", "confirmed")
    .maybeSingle();
  if (error || !booking) {
    return NextResponse.json(
      { error: "Calendar event was not found" },
      { status: 404 },
    );
  }
  const slot = one(booking.inspection_time_slots) as {
    starts_at: string;
    ends_at: string;
    address?: string | null;
  } | null;
  const listing = one(booking.listings) as { address?: string | null } | null;
  if (!slot) {
    return NextResponse.json(
      { error: "Calendar event was not found" },
      { status: 404 },
    );
  }
  const address = listing?.address || slot.address || "Property inspection";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clippy//Property Inspection//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@useclippy.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(slot.starts_at)}`,
    `DTEND:${icsDate(slot.ends_at)}`,
    `SUMMARY:${icsEscape(`Property inspection – ${address}`)}`,
    `LOCATION:${icsEscape(address)}`,
    "DESCRIPTION:Property inspection booked through Clippy. Reminders will be sent before the inspection.",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Property inspection in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="property-inspection.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
