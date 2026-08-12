import { CalendarDays, CheckCircle2, Clock3, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

function googleDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export default async function InspectionCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!z.string().uuid().safeParse(token).success) notFound();

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("inspection_bookings")
    .select(
      "booking_status,inspection_time_slots(starts_at,ends_at,address),listings(address)",
    )
    .eq("client_calendar_token", token)
    .eq("booking_status", "confirmed")
    .maybeSingle();
  if (!booking) notFound();

  const slot = one(booking.inspection_time_slots) as {
    starts_at: string;
    ends_at: string;
    address?: string | null;
  } | null;
  const listing = one(booking.listings) as { address?: string | null } | null;
  if (!slot) notFound();

  const address = listing?.address || slot.address || "Property inspection";
  const title = `Property inspection – ${address}`;
  const description =
    "Property inspection booked through Clippy. Reminders will be sent before the inspection.";
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${googleDate(slot.starts_at)}/${googleDate(slot.ends_at)}`,
    location: address,
    details: description,
  });
  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: new Date(slot.starts_at).toISOString(),
    enddt: new Date(slot.ends_at).toISOString(),
    location: address,
    body: description,
  });
  const startsAt = new Date(slot.starts_at);
  const endsAt = new Date(slot.ends_at);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-emerald-600 px-7 py-8 text-white">
          <CheckCircle2 className="h-12 w-12" />
          <p className="mt-5 text-sm font-medium text-emerald-100">
            No Clippy account required
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Your inspection is confirmed
          </h1>
        </div>

        <div className="space-y-6 p-7">
          <div className="space-y-3 rounded-2xl bg-slate-50 p-5 text-slate-700">
            <p className="flex items-center gap-3 font-medium text-slate-900">
              <MapPin className="h-5 w-5 text-emerald-600" /> {address}
            </p>
            <p className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {startsAt.toLocaleDateString("en-AU", {
                timeZone: "Australia/Melbourne",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-emerald-600" />
              {startsAt.toLocaleTimeString("en-AU", {
                timeZone: "Australia/Melbourne",
                hour: "numeric",
                minute: "2-digit",
              })}
              {" – "}
              {endsAt.toLocaleTimeString("en-AU", {
                timeZone: "Australia/Melbourne",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">Add to calendar</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose the calendar you use. You do not need to sign in to Clippy.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={`/api/public/inspection-calendar/${token}`}
              className="rounded-xl bg-slate-900 px-5 py-3 text-center font-medium text-white hover:bg-slate-800"
            >
              Apple / device calendar
            </a>
            <a
              href={`https://calendar.google.com/calendar/render?${googleParams.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center font-medium text-slate-800 hover:bg-slate-50"
            >
              Google Calendar
            </a>
            <a
              href={`https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center font-medium text-slate-800 hover:bg-slate-50 sm:col-span-2"
            >
              Outlook Calendar
            </a>
          </div>

          <p className="text-center text-sm text-slate-500">
            You’ll also receive email reminders 24 hours and 2 hours before the
            inspection.
          </p>
        </div>
      </section>
    </main>
  );
}
