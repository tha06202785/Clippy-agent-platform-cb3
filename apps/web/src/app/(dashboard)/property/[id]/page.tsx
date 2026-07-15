"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Home, Bed, Bath, DollarSign, Calendar, Edit, Trash2, ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

interface Listing {
  id: string; address: string; price: string | null; bedrooms: number | null;
  bathrooms: number | null; property_type: string | null; status: string;
  description: string | null; features: string[] | null; images: string[] | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500", pending: "bg-amber-500", sold: "bg-blue-500",
  expired: "bg-slate-400", draft: "bg-purple-500", withdrawn: "bg-red-500",
};

export default function PropertyRoomPage() {
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch("/api/listings/" + id)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setListing(data);
      })
      .catch(() => setError("Failed to load property"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="space-y-6">
        <Link href="/deals" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Property not found</p>
          <p className="text-sm mt-1">{error || "This property does not exist or you don't have access."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/deals" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-muted">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-border p-6 md:p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white " + (statusColors[listing.status] || "bg-slate-400")}>
                {listing.status}
              </span>
              <span className="text-xs text-muted-foreground">{listing.property_type || "Property"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2">{listing.address}</h1>
            {listing.price && <p className="text-xl font-semibold text-primary mt-1">${listing.price}</p>}
          </div>
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* stats */}
      </div>
    </div>
  );
}
