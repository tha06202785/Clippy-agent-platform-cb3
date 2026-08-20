"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

interface App {
  id: string;
  listing_id: string;
  lead_id: string;
  inspection_booking_id: string | null;
  external_provider: string | null;
  application_url: string | null;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  leads: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  listings: { address: string | null; price: string | null };
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rental-applications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setApps(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/rental-applications?id=" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    link_sent: "bg-blue-100 text-blue-700",
    started: "bg-amber-100 text-amber-700",
    submitted: "bg-purple-100 text-purple-700",
    under_review: "bg-indigo-100 text-indigo-700",
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-700",
    leased_elsewhere: "bg-orange-100 text-orange-700",
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Rental Applications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track applications from inspection through to lease signing
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No applications yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Applications will appear here when tenants apply after inspections.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {a.leads?.full_name || "Unknown"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {a.listings?.address || "Unknown property"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={
                          "text-[10px] px-1.5 py-0.5 rounded " +
                          (statusColors[a.status] || "bg-muted")
                        }
                      >
                        {a.status.replace("_", " ")}
                      </span>
                      {a.submitted_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Submitted{" "}
                          {new Date(a.submitted_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {a.application_url && (
                      <a
                        href={a.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View Application
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {a.status === "submitted" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(a.id, "approved")}
                        className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(a.id, "declined")}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {a.status === "under_review" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(a.id, "approved")}
                        className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(a.id, "declined")}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {a.status === "not_started" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(a.id, "link_sent")}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Send Link
                    </button>
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
