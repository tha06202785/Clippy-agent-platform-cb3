"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin } from "lucide-react";

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booking_count: number;
  inspection_type: string;
};

type BookingData = {
  client_first_name: string | null;
  property_address: string | null;
  slots: Slot[];
};

export default function BookingClient({ token }: { token: string }) {
  const [data, setData] = useState<BookingData | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");

  useEffect(() => {
    fetch(`/api/public/inspection-booking/${token}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Booking link is unavailable");
        setData(payload);
        setSelected(payload.slots?.[0]?.id || "");
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmBooking() {
    if (!selected) return;
    setBooking(true);
    setError("");
    try {
      const response = await fetch(`/api/public/inspection-booking/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: selected, attendee_count: 1 }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Inspection could not be booked");
      setCalendarUrl(payload.calendar_url || "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Inspection could not be booked",
      );
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto h-80 max-w-xl animate-pulse rounded-3xl bg-white shadow-sm" />
      </main>
    );
  }

  if (calendarUrl) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <section className="mx-auto max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">
            Inspection confirmed
          </h1>
          <p className="mt-3 text-slate-600">
            We’ve sent your confirmation and will remind you 24 hours and 2
            hours before the inspection.
          </p>
          <a
            href={calendarUrl}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
          >
            <CalendarDays className="h-5 w-5" /> Add to my calendar
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-emerald-600 px-7 py-8 text-white">
          <p className="text-sm font-medium text-emerald-100">
            Clippy inspection booking
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {data?.client_first_name
              ? `Hi ${data.client_first_name}, choose an inspection time`
              : "Choose an inspection time"}
          </h1>
          {data?.property_address && (
            <p className="mt-3 flex items-center gap-2 text-emerald-50">
              <MapPin className="h-4 w-4" /> {data.property_address}
            </p>
          )}
        </div>

        <div className="space-y-5 p-7">
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          {!data?.slots.length ? (
            <p className="text-slate-600">
              No inspection times are currently available. Please check again
              shortly.
            </p>
          ) : (
            <div className="space-y-3">
              {data.slots.map((slot) => {
                const date = new Date(slot.starts_at);
                return (
                  <label
                    key={slot.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${selected === slot.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <input
                      type="radio"
                      name="inspection-slot"
                      value={slot.id}
                      checked={selected === slot.id}
                      onChange={() => setSelected(slot.id)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <CalendarDays className="h-5 w-5 text-emerald-600" />
                    <span className="flex-1">
                      <span className="block font-medium text-slate-900">
                        {date.toLocaleDateString("en-AU", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Clock3 className="h-4 w-4" />
                        {date.toLocaleTimeString("en-AU", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            disabled={!selected || booking}
            onClick={confirmBooking}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {booking ? "Confirming…" : "Confirm inspection"}
          </button>
          <p className="text-center text-xs text-slate-500">
            We’ll email your confirmation and send reminders before the
            inspection.
          </p>
        </div>
      </section>
    </main>
  );
}
