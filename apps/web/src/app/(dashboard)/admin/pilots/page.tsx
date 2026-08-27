"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarPlus,
  Loader2,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";
import type { PilotInviteRecord, PilotInviteStatus } from "@/lib/pilot-invites";

type DisplayInvite = PilotInviteRecord & { display_status: PilotInviteStatus };

type PilotData = {
  invites: DisplayInvite[];
  activeCount: number;
  limits: {
    maxActive: number;
    trialDays: number;
    inviteValidityHours: number;
  };
};

const dateTime = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Melbourne",
});

function formatDate(value: string | null): string {
  return value ? dateTime.format(new Date(value)) : "—";
}

function statusClasses(status: PilotInviteStatus): string {
  if (status === "accepted") return "bg-emerald-100 text-emerald-800";
  if (status === "pending") return "bg-blue-100 text-blue-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export default function PilotInvitesPage() {
  const [data, setData] = useState<PilotData | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pilot-invites", {
        cache: "no-store",
      });
      const payload = (await response.json()) as PilotData & { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Pilot invites could not be loaded");
      setData(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Pilot invites could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function inviteAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/pilot-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Invitation could not be sent");
      setEmail("");
      setNotice(payload.message || "Private pilot invitation sent");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Invitation could not be sent",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function act(
    invite: DisplayInvite,
    action: "revoke" | "resend" | "extend",
  ) {
    if (
      action === "revoke" &&
      !window.confirm(`Revoke pilot access for ${invite.email}?`)
    )
      return;
    setBusyId(invite.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/pilot-invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "extend" ? { action, days: 14 } : { action },
        ),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Pilot access could not be updated");
      setNotice(
        payload.message ||
          (action === "extend" ? "Pilot extended by 14 days" : "Pilot updated"),
      );
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Pilot access could not be updated",
      );
    } finally {
      setBusyId("");
    }
  }

  const limits = data?.limits || {
    maxActive: 5,
    trialDays: 14,
    inviteValidityHours: 72,
  };
  const atLimit = (data?.activeCount || 0) >= limits.maxActive;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Private beta
          </p>
          <h1 className="mt-1 text-2xl font-bold">Pilot agents</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Invite specific agents to a {limits.trialDays}-day Clippy pilot.
            Each emailed link is tied to one address, works once, and expires
            after {limits.inviteValidityHours} hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Active pilot places</p>
          <p className="mt-2 text-3xl font-bold">
            {data?.activeCount || 0}/{limits.maxActive}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Free access</p>
          <p className="mt-2 text-3xl font-bold">{limits.trialDays} days</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Payment details</p>
          <p className="mt-2 text-3xl font-bold">Not required</p>
        </div>
      </section>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Send a secure invitation</h2>
        </div>
        <form
          onSubmit={inviteAgent}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="pilot-email">
            Agent email
          </label>
          <input
            id="pilot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="agent@agency.com.au"
            className="min-h-11 flex-1 rounded-xl border bg-background px-4 text-sm outline-none ring-primary focus:ring-2"
          />
          <button
            type="submit"
            disabled={submitting || atLimit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send private invite
          </button>
        </form>
        {atLimit && (
          <p className="mt-3 text-sm text-amber-700">
            Revoke or wait for a pilot to end before inviting another agent.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Invitation history</h2>
        </div>
        {loading && !data ? (
          <div className="grid min-h-40 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data?.invites.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="p-4">
                    Agent
                  </th>
                  <th scope="col" className="p-4">
                    Status
                  </th>
                  <th scope="col" className="p-4">
                    Invite expires
                  </th>
                  <th scope="col" className="p-4">
                    Pilot ends
                  </th>
                  <th scope="col" className="p-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="p-4 font-medium">{invite.email}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(invite.display_status)}`}
                      >
                        {invite.display_status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(invite.expires_at)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(invite.trial_ends_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {invite.display_status === "pending" && (
                          <button
                            type="button"
                            onClick={() => void act(invite, "resend")}
                            disabled={busyId === invite.id}
                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium hover:bg-muted disabled:opacity-50"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            Resend
                          </button>
                        )}
                        {["accepted", "expired"].includes(invite.status) &&
                          invite.org_id && (
                            <button
                              type="button"
                              onClick={() => void act(invite, "extend")}
                              disabled={busyId === invite.id}
                              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-medium hover:bg-muted disabled:opacity-50"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              +14 days
                            </button>
                          )}
                        {(
                          ["pending", "accepted"] as PilotInviteStatus[]
                        ).includes(invite.display_status) && (
                          <button
                            type="button"
                            onClick={() => void act(invite, "revoke")}
                            disabled={busyId === invite.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <UserRoundX className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No pilot invitations have been sent yet.
          </p>
        )}
      </section>
    </div>
  );
}
