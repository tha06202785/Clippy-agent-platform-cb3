"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle, User, Home } from "lucide-react";

interface Booking {
  id: string;
  lead_id: string;
  listing_id: string;
  scheduled_at: string;
  status: string;
  attendees: number;
  notes: string | null;
  confirmed_by_lead: boolean;
  leads: { full_name: string | null; email: string | null; phone: string | null };
  listings: { address: string | null; price: string | null };
}

export default function InspectionsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inspection-bookings")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBookings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/inspection-bookings?id=" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inspections</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage property inspection bookings</p>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No inspections booked</h3>
          <p className="text-sm text-muted-foreground">Inspections will appear here when leads book through the AI or agents schedule them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={"w-10 h-10 rounded-lg flex items-center justify-center " +
                    (b.status === "confirmed" ? "bg-emerald-100" : b.status === "completed" ? "bg-blue-100" : b.status === "cancelled" ? "bg-red-100" : "bg-amber-100")}>
                    {b.status === "confirmed" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                     b.status === "completed" ? <CheckCircle className="w-5 h-5 text-blue-600" /> :
                     b.status === "cancelled" ? <XCircle className="w-5 h-5 text-red-600" /> :
                     <Clock className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{b.leads?.full_name || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground">{b.listings?.address || "Unknown property"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(b.scheduled_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(b.scheduled_at).toLocaleTimeString()}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {b.attendees}</span>
                    </div>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {b.status === "pending" && (
                    <>
                      <button onClick={() => updateStatus(b.id, "confirmed")}
                        className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200">Confirm</button>
                      <button onClick={() => updateStatus(b.id, "cancelled")}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200">Cancel</button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => updateStatus(b.id, "completed")}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">Complete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
