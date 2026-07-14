"use client";

import { useEffect, useState } from "react";
import { FileText, Home, TrendingUp } from "lucide-react";

interface Listing {
  id: string;
  address: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  property_type: string | null;
  created_at: string;
}

const stageColors: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  sold: "bg-blue-500",
  expired: "bg-slate-400",
  draft: "bg-purple-500",
};

export function DealsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setListings(data);
        else setListings([]);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage your active property deals</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No listings yet</h3>
          <p className="text-sm text-muted-foreground">Add your first property listing to start tracking deals.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{listing.address}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {listing.bedrooms ? listing.bedrooms + " bed" : ""}
                      {listing.bathrooms ? " | " + listing.bathrooms + " bath" : ""}
                      {listing.price ? " | $" + listing.price : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{listing.property_type || "Property"}</p>
                  </div>
                </div>
                <span className={"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white " + (stageColors[listing.status] || "bg-slate-400")}>
                  {listing.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
