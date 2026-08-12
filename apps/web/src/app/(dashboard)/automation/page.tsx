"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

type Mode = "automatic" | "approval" | "off";
type Action = {
  key: string;
  label: string;
  description: string;
  group: "Data" | "Appointments" | "Communication";
  recommended: Mode;
};
type Settings = {
  ai_paused: boolean;
  action_modes: Record<string, Mode>;
  max_messages_per_client_day: number;
  minimum_confidence: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  actions: Action[];
};
type Approval = {
  id: string;
  action_key: string;
  channel: string;
  recipient: string;
  subject: string | null;
  content: string;
  confidence: number | null;
  reason: string | null;
  requested_at: string;
  leads?: { full_name?: string | null } | Array<{ full_name?: string | null }>;
};

const modeStyle: Record<Mode, string> = {
  automatic: "border-emerald-200 bg-emerald-50 text-emerald-800",
  approval: "border-amber-200 bg-amber-50 text-amber-800",
  off: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function AutomationPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deciding, setDeciding] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [settingsResponse, approvalsResponse] = await Promise.all([
        fetch("/api/automation", { cache: "no-store" }),
        fetch("/api/automation/approvals", { cache: "no-store" }),
      ]);
      const settingsData = await settingsResponse.json();
      const approvalData = await approvalsResponse.json();
      if (!settingsResponse.ok)
        throw new Error(
          settingsData.error || "Automation settings unavailable",
        );
      setSettings(settingsData);
      if (approvalsResponse.ok) setApprovals(approvalData);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Automation settings could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const result = new Map<string, Action[]>();
    for (const action of settings?.actions || []) {
      result.set(action.group, [...(result.get(action.group) || []), action]);
    }
    return result;
  }, [settings?.actions]);

  async function save(pauseOverride?: boolean) {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paused: pauseOverride ?? settings.ai_paused,
          action_modes: settings.action_modes,
          max_messages_per_client_day: settings.max_messages_per_client_day,
          minimum_confidence: settings.minimum_confidence,
          quiet_hours_start: settings.quiet_hours_start,
          quiet_hours_end: settings.quiet_hours_end,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save");
      setSettings((current) =>
        current
          ? { ...current, ...data, ai_paused: Boolean(data.ai_paused) }
          : current,
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setDeciding(id);
    setError(null);
    try {
      const response = await fetch(`/api/automation/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          ...(decision === "approve"
            ? { content: approvals.find((item) => item.id === id)?.content }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Decision failed");
      setApprovals((current) => current.filter((item) => item.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Decision failed");
    } finally {
      setDeciding("");
    }
  }

  if (loading || !settings)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-24">
      <section className="rounded-3xl border bg-gradient-to-br from-white via-purple-50 to-emerald-50 p-6 shadow-soft md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <ShieldCheck className="h-9 w-9 text-purple-700" />
            <h1 className="mt-4 text-3xl font-bold">
              Clippy Controlled Autonomy
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Choose what Clippy may do automatically, what needs your approval,
              and what must stay off.
            </p>
          </div>
          <button
            disabled={saving}
            onClick={() => void save(!settings.ai_paused)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${settings.ai_paused ? "bg-emerald-600" : "bg-neutral-900"}`}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : settings.ai_paused ? (
              <PlayCircle className="h-5 w-5" />
            ) : (
              <PauseCircle className="h-5 w-5" />
            )}
            {settings.ai_paused ? "Resume Clippy" : "Pause all automation"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section
        className={`rounded-3xl border p-5 shadow-soft ${settings.ai_paused ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}
      >
        <p className="text-xs font-bold uppercase tracking-wide">
          Current status
        </p>
        <h2 className="mt-1 text-xl font-bold">
          {settings.ai_paused
            ? "All autonomous actions are paused"
            : "Clippy is following the permissions below"}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Approval-required actions stay in the queue until an agent approves or
          rejects them.
        </p>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-soft md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Approval queue</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Review exactly what Clippy proposes before anything is sent.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            {approvals.length} pending
          </span>
        </div>
        <div className="mt-5 space-y-4">
          {approvals.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
              Nothing needs approval right now.
            </div>
          ) : (
            approvals.map((approval) => (
              <article key={approval.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      {approval.action_key.replaceAll("_", " ")} ·{" "}
                      {approval.channel}
                    </p>
                    <h3 className="mt-1 font-bold">
                      {approval.subject || `Message to ${approval.recipient}`}
                    </h3>
                    {approval.reason && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {approval.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      disabled={deciding === approval.id}
                      onClick={() => void decide(approval.id, "reject")}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                    <button
                      disabled={
                        deciding === approval.id || !approval.content.trim()
                      }
                      onClick={() => void decide(approval.id, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {deciding === approval.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve & send
                    </button>
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Review and edit · your final version helps Clippy learn your
                    voice
                  </span>
                  <textarea
                    value={approval.content}
                    disabled={deciding === approval.id}
                    onChange={(event) =>
                      setApprovals((current) =>
                        current.map((item) =>
                          item.id === approval.id
                            ? { ...item, content: event.target.value }
                            : item,
                        ),
                      )
                    }
                    rows={6}
                    className="mt-2 w-full resize-y whitespace-pre-wrap rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700 outline-none focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                  />
                </label>
              </article>
            ))
          )}
        </div>
      </section>

      {[...grouped.entries()].map(([group, actions]) => (
        <section
          key={group}
          className="rounded-3xl border bg-white p-5 shadow-soft md:p-6"
        >
          <h2 className="text-xl font-bold">{group}</h2>
          <div className="mt-4 divide-y">
            {actions.map((action) => {
              const mode =
                settings.action_modes[action.key] || action.recommended;
              return (
                <div
                  key={action.key}
                  className="grid gap-3 py-4 md:grid-cols-[1fr_180px] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{action.label}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${modeStyle[action.recommended]}`}
                      >
                        Recommended: {action.recommended}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {action.description}
                    </p>
                  </div>
                  <select
                    aria-label={`${action.label} permission`}
                    value={mode}
                    onChange={(event) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              action_modes: {
                                ...current.action_modes,
                                [action.key]: event.target.value as Mode,
                              },
                            }
                          : current,
                      )
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${modeStyle[mode]}`}
                  >
                    <option value="automatic">Automatic</option>
                    <option value="approval">Needs approval</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-xl font-bold">Safety limits</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <label className="text-sm font-medium">
            Daily automated-message limit
            <input
              type="number"
              min={1}
              max={20}
              value={settings.max_messages_per_client_day}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  max_messages_per_client_day: Number(event.target.value),
                })
              }
              className="mt-2 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            Minimum AI confidence
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={settings.minimum_confidence}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minimum_confidence: Number(event.target.value),
                })
              }
              className="mt-2 w-full rounded-xl border px-3 py-2"
            />
          </label>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" /> Quiet hours
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="time"
                value={settings.quiet_hours_start}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    quiet_hours_start: event.target.value,
                  })
                }
                className="min-w-0 flex-1 rounded-xl border px-3 py-2"
              />
              <span>to</span>
              <input
                type="time"
                value={settings.quiet_hours_end}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    quiet_hours_end: event.target.value,
                  })
                }
                className="min-w-0 flex-1 rounded-xl border px-3 py-2"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="sticky bottom-20 flex justify-end md:bottom-4">
        <button
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saved ? "Saved" : "Save automation settings"}
        </button>
      </div>
    </main>
  );
}
