"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Edit3, Save, X } from "lucide-react";

interface ListingFacts {
  verified_price?: string | null;
  verified_bedrooms?: number | null;
  verified_bathrooms?: number | null;
  verified_land_size?: string | null;
  verified_building_size?: string | null;
  verified_inspection_times?: string[] | null;
  verified_availability?: string | null;
  school_zones?: string[] | null;
  nearby_amenities?: string[] | null;
  last_verified_at?: string | null;
}

export default function ListingFactsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [facts, setFacts] = useState<ListingFacts>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<ListingFacts>({});

  useEffect(() => {
    if (!id) return;
    fetch("/api/listings/" + id + "/facts")
      .then(r => r.json())
      .then(data => { setFacts(data); setEdit(data); })
      .catch(() => {});
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/listings/" + id + "/facts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (res.ok) {
        const data = await res.json();
        setFacts(data);
        setEditing(false);
      }
    } catch {}
    setSaving(false);
  };

  const fields = [
    { key: "verified_price", label: "Verified Price", type: "text" },
    { key: "verified_bedrooms", label: "Verified Bedrooms", type: "number" },
    { key: "verified_bathrooms", label: "Verified Bathrooms", type: "number" },
    { key: "verified_land_size", label: "Land Size", type: "text" },
    { key: "verified_building_size", label: "Building Size", type: "text" },
    { key: "verified_availability", label: "Availability", type: "text" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listing Facts</h1>
          <p className="text-muted-foreground text-sm mt-1">Authoritative source of truth for AI replies</p>
        </div>
        {facts.last_verified_at && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle className="w-3 h-3" /> Verified {new Date(facts.last_verified_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {!editing ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key}>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-medium text-foreground">{(facts as any)[f.key] || "Not set"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">School Zones</p>
            <p className="text-sm text-foreground">{(facts.school_zones || []).join(", ") || "Not set"}</p>
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Nearby Amenities</p>
            <p className="text-sm text-foreground">{(facts.nearby_amenities || []).join(", ") || "Not set"}</p>
          </div>
          <button onClick={() => setEditing(true)}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">
            <Edit3 className="w-3.5 h-3.5" /> Edit Facts
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <input type={f.type} value={(edit as any)[f.key] || ""}
                onChange={e => setEdit({...edit, [f.key]: e.target.value})}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground">School Zones (comma separated)</label>
            <input type="text" value={(edit.school_zones || []).join(", ")}
              onChange={e => setEdit({...edit, school_zones: e.target.value.split(", ").filter(Boolean)})}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nearby Amenities (comma separated)</label>
            <input type="text" value={(edit.nearby_amenities || []).join(", ")}
              onChange={e => setEdit({...edit, nearby_amenities: e.target.value.split(", ").filter(Boolean)})}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditing(false); setEdit(facts); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Facts"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>AI uses these facts</strong> — The AI brain reads listing_facts before replying to leads. Only verified data is used. Never set a value you cannot confirm.
      </div>
    </div>
  );
}
