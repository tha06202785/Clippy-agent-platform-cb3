"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Plus, Clock, Calendar, Trash2, Edit3 } from "lucide-react";

interface Slot {
  id: string; listing_id: string; starts_at: string; ends_at: string;
  timezone: string; inspection_type: string; capacity: number;
  booking_count: number; status: string; location_notes: string | null;
  listings: { address: string | null; price: string | null } | null;
}

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ listing_id: "", starts_at: "", ends_at: "", capacity: "10", inspection_type: "open_home", location_notes: "" });
  const [listings, setListings] = useState<Array<{id: string; address: string | null}>>([]);

  useEffect(() => {
    fetch("/api/listings")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setListings(d); })
      .catch(() => {});
  }, []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/inspection-slots")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSlots(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createSlot = async () => {
    if (!form.listing_id || !form.starts_at) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inspection-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: form.listing_id,
          starts_at: form.starts_at,
          ends_at: form.ends_at || form.starts_at,
          capacity: parseInt(form.capacity),
          inspection_type: form.inspection_type,
          location_notes: form.location_notes || null,
        }),
      });
      if (res.ok) {
        const newSlot = await res.json();
        setSlots(prev => [newSlot, ...prev]);
        setShowForm(false);
        setForm({ listing_id: "", starts_at: "", ends_at: "", capacity: "10", inspection_type: "open_home", location_notes: "" });
      }
    } catch {}
    setSaving(false);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "cancelled" : "published";
    const res = await fetch("/api/inspection-slots?id=" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setSlots(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspection Time Slots</h1>
          <p className="text-muted-foreground text-sm mt-1">Set available inspection times for your properties</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Slot
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Create Inspection Slot</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Listing ID</label>
              <select value={form.listing_id} onChange={e => setForm({...form, listing_id: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Select a listing...</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.address || l.id.substring(0, 8) + "..."}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select value={form.inspection_type} onChange={e => setForm({...form, inspection_type: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="open_home">Open Home</option>
                <option value="private">Private Inspection</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start Time</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Time</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Location Notes</label>
              <input type="text" value={form.location_notes} onChange={e => setForm({...form, location_notes: e.target.value})}
                placeholder="Enter via side gate" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
            <button onClick={createSlot} disabled={saving}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Creating..." : "Create Slot"}
            </button>
          </div>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No time slots</h3>
          <p className="text-sm text-muted-foreground">Create your first inspection time slot to let tenants book viewings.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(s => (
            <div key={s.id} className={"rounded-xl border p-4 flex items-center justify-between " + (s.status === "published" ? "border-border bg-card" : "border-red-200 bg-red-50")}>
              <div className="flex items-center gap-3">
                <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + (s.status === "published" ? "bg-blue-100" : "bg-red-100")}>
                  <Calendar className={"w-4 h-4 " + (s.status === "published" ? "text-blue-600" : "text-red-600")} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.listings?.address || s.listing_id.substring(0, 8) + "..."}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(s.starts_at).toLocaleDateString()} {new Date(s.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="capitalize">{s.inspection_type}</span>
                    <span>{s.booking_count}/{s.capacity} booked</span>
                    <span className={"px-1 py-0.5 rounded text-[10px] " + (s.status === "published" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{s.status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => toggleStatus(s.id, s.status)}
                className={"px-2 py-1 text-xs rounded-md " + (s.status === "published" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200")}>
                {s.status === "published" ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
