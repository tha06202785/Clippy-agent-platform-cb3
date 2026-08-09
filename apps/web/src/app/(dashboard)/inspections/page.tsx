"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle, User, Home, Filter, Plus } from "lucide-react";

interface Booking {
  id: string; slot_id: string; listing_id: string; lead_id: string;
  booking_status: string; attendance_status: string; attendee_count: number;
  source_channel: string; created_at: string;
  inspection_time_slots: { starts_at: string; ends_at: string; capacity: number; inspection_type: string; address: string } | null;
  leads: { full_name: string | null; email: string | null; phone: string | null };
  listings: { address: string | null; price: string | null };
}

export default function InspectionsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inspection-bookings")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBookings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateAttendance = async (id: string, status: string) => {
    setError(null);
    const response = await fetch("/api/inspection-bookings?id=" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendance_status: status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Attendance could not be updated.");
      return;
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, attendance_status: data.attendance_status } : b));
  };

  const cancelBooking = async (id: string) => {
    setError(null);
    const response = await fetch("/api/inspection-bookings/" + id + "/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "cancelled_by_agent" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Inspection could not be cancelled.");
      return;
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, booking_status: "cancelled" } : b));
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.booking_status === filter);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspections</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage inspection bookings, attendance, and follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
            <option value="all">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No inspections booked</h3>
          <p className="text-sm text-muted-foreground">Inspections will appear here when tenants book through the AI or agents schedule them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const slot = b.inspection_time_slots;
            const lead = b.leads;
            const listing = b.listings;
            const isUpcoming = b.booking_status === "confirmed" && new Date(slot?.starts_at || "") > new Date();
            const isPast = b.booking_status === "confirmed" && new Date(slot?.starts_at || "") < new Date();

            return (
              <div key={b.id} className={"rounded-xl border p-5 " + (
                b.booking_status === "cancelled" ? "border-red-200 bg-red-50" :
                b.attendance_status === "attended" ? "border-emerald-200 bg-emerald-50" :
                b.attendance_status === "did_not_attend" ? "border-amber-200 bg-amber-50" :
                "border-border bg-card"
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={"w-10 h-10 rounded-lg flex items-center justify-center " + (
                      b.booking_status === "cancelled" ? "bg-red-100" :
                      b.attendance_status === "attended" ? "bg-emerald-100" :
                      b.attendance_status === "did_not_attend" ? "bg-amber-100" :
                      "bg-blue-100"
                    )}>
                      {b.booking_status === "cancelled" ? <XCircle className="w-5 h-5 text-red-600" /> :
                       b.attendance_status === "attended" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                       b.attendance_status === "did_not_attend" ? <XCircle className="w-5 h-5 text-amber-600" /> :
                       <Calendar className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{lead?.full_name || "Unknown"}</h3>
                      <p className="text-sm text-muted-foreground">{listing?.address || "Unknown property"}</p>
                      {slot && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(slot.starts_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(slot.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {b.attendee_count}</span>
                          <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-muted">{slot.inspection_type}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={"text-[10px] px-1.5 py-0.5 rounded " + (
                          b.booking_status === "confirmed" ? "bg-blue-100 text-blue-700" :
                          b.booking_status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        )}>{b.booking_status}</span>
                        <span className={"text-[10px] px-1.5 py-0.5 rounded " + (
                          b.attendance_status === "attended" ? "bg-emerald-100 text-emerald-700" :
                          b.attendance_status === "did_not_attend" ? "bg-amber-100 text-amber-700" :
                          "bg-muted text-muted-foreground"
                        )}>{b.attendance_status === "unknown" ? "pending" : b.attendance_status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {isUpcoming && (
                      <>
                        <button onClick={() => updateAttendance(b.id, "attended")}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200">Attended</button>
                        <button onClick={() => updateAttendance(b.id, "did_not_attend")}
                          className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200">No Show</button>
                        <button onClick={() => cancelBooking(b.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200">Cancel</button>
                      </>
                    )}
                    {isPast && b.attendance_status === "unknown" && (
                      <>
                        <button onClick={() => updateAttendance(b.id, "attended")}
                          className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200">Mark Attended</button>
                        <button onClick={() => updateAttendance(b.id, "did_not_attend")}
                          className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200">Mark No Show</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
