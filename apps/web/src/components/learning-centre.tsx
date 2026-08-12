"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Ban,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock3,
  DatabaseZap,
  Eye,
  FileLock2,
  Mail,
  History,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

type LearningSettings = {
  learning_enabled: boolean;
  learn_from_sent: boolean;
  learn_from_approved: boolean;
  learn_from_corrections: boolean;
  learn_client_preferences: boolean;
  automation_level: "observe" | "assist" | "draft" | "trusted";
  last_message_scan_at: string | null;
  last_sent_sync_at: string | null;
  sent_backfill_complete: boolean;
};

type AgentProfile = {
  style_summary?: string | null;
  style_rules?: Record<string, unknown> | null;
  avoid_phrases?: string[] | null;
  common_greetings?: string[] | null;
  common_signoffs?: string[] | null;
  communication_tone?: string | null;
  average_message_words?: number | null;
  learned_sample_count?: number | null;
  confidence_score?: number | null;
  status?: string | null;
  last_learned_at?: string | null;
};

type VoiceExample = {
  id: string;
  source: string;
  channel: string;
  situation: string;
  subject?: string | null;
  content: string;
  quality_score: number;
  excluded: boolean;
  occurred_at: string;
};

type LearningEvent = {
  id: string;
  event_type: string;
  guidance_text?: string | null;
  applied_scope: string;
  created_at: string;
};

type ClientPreference = {
  id: string;
  client_name: string;
  communication_preference?: string | null;
  tone_preference?: string | null;
  length_preference?: string | null;
  language_preference?: string | null;
  reminder_preference?: string | null;
  preference_confidence: number;
  preference_evidence_count: number;
  last_preference_evidence_at?: string | null;
};

type LearningData = {
  settings: LearningSettings;
  profile: AgentProfile | null;
  examples: VoiceExample[];
  events: LearningEvent[];
  clients: ClientPreference[];
  gmail: {
    status?: string;
    last_sync_at?: string | null;
    last_error?: string | null;
  } | null;
  stats: {
    examples: number;
    excluded: number;
    approved: number;
    edited: number;
    rejected: number;
    client_preferences: number;
    sources: Record<string, number>;
  };
  privacy: { raw_examples_retained: false; note: string };
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload as T;
}

function formatDate(value?: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-emerald-600" : "bg-neutral-300"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-4 last:border-0">
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
          {description}
        </p>
      </div>
      <Toggle
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        label={title}
      />
    </div>
  );
}

const sourceLabels: Record<string, string> = {
  gmail_sent: "Gmail Sent",
  approved_draft: "Approved unchanged",
  agent_edit: "Agent edit",
  manual: "Manual example",
  outbound_message: "Sent conversation",
};

const eventLabels: Record<string, string> = {
  approved: "Draft approved",
  edited: "Draft edited and approved",
  rejected: "Draft rejected",
  explicit_rule: "Agent rule added",
  never_say: "Never-say rule added",
  example_excluded: "Voice example updated",
  client_preference_updated: "Client preference detected",
  profile_reset: "Agent DNA reset",
};

export function LearningCentre() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [neverSay, setNeverSay] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await jsonRequest<LearningData>("/api/learning"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load Adaptive Intelligence",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSettings = async (patch: Partial<LearningSettings>) => {
    if (!data || saving) return;
    const previous = data.settings;
    setData({ ...data, settings: { ...data.settings, ...patch } });
    setSaving(true);
    try {
      const result = await jsonRequest<{ settings: LearningSettings }>(
        "/api/learning",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      setData((current) =>
        current ? { ...current, settings: result.settings } : current,
      );
      toast.success("Learning preferences saved");
    } catch (reason) {
      setData((current) =>
        current ? { ...current, settings: previous } : current,
      );
      toast.error(reason instanceof Error ? reason.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (body: Record<string, unknown>) => {
    await jsonRequest("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  };

  const syncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await runAction({ action: "sync" });
      toast.success("Clippy finished this learning pass");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const teach = async (event: FormEvent) => {
    event.preventDefault();
    if (!guidance.trim() || saving) return;
    setSaving(true);
    try {
      await runAction({
        action: "guidance",
        guidance: guidance.trim(),
        never_say: neverSay,
      });
      setGuidance("");
      setNeverSay(false);
      toast.success(neverSay ? "Never-say rule added" : "Agent rule added");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not teach Clippy",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleExample = async (example: VoiceExample) => {
    try {
      await runAction({
        action: example.excluded ? "include_example" : "exclude_example",
        example_id: example.id,
      });
      toast.success(example.excluded ? "Example restored" : "Example excluded");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not update example",
      );
    }
  };

  const resetProfile = async () => {
    if (
      !window.confirm(
        "Delete your learned voice examples, feedback history and Agent DNA? Client records and emails will not be deleted.",
      )
    )
      return;
    setSaving(true);
    try {
      await runAction({ action: "reset" });
      toast.success("Agent DNA reset");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Could not reset Agent DNA",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error || "Adaptive Intelligence is unavailable."}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="ml-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { settings, profile, stats } = data;
  const confidence = profile?.confidence_score || 0;
  const activeExamples = data.examples.filter((example) => !example.excluded);
  const styleRules = profile?.style_rules || {};
  const learnedTone =
    typeof styleRules.tone === "string"
      ? styleRules.tone
      : profile?.communication_tone;
  const explicitRules = Array.isArray(styleRules.explicit)
    ? styleRules.explicit.filter(
        (rule): rule is string => typeof rule === "string",
      )
    : [];

  return (
    <main className="space-y-6 bg-neutral-50 p-4 pb-28 md:p-6">
      <header className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-violet-50 p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg shadow-neutral-300">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
                  Adaptive Intelligence
                </h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    settings.learning_enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {settings.learning_enabled ? "Learning on" : "Paused"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Clippy learns your communication cadence from sent and approved
                messages, remembers explicit client preferences, and improves
                future drafts while every client message remains approval-first.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing || !settings.learning_enabled}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Learning…" : "Learn now"}
            </button>
            <Toggle
              checked={settings.learning_enabled}
              disabled={saving}
              onChange={(learning_enabled) =>
                void updateSettings({ learning_enabled })
              }
              label="Continuous learning"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Voice examples",
              value: stats.examples,
              detail: `${stats.edited} reviewed edits`,
              icon: MessageSquareText,
              color: "text-violet-600 bg-violet-100",
            },
            {
              label: "Profile confidence",
              value: `${confidence}%`,
              detail:
                profile?.status === "active"
                  ? "Agent DNA active"
                  : "Still calibrating",
              icon: Sparkles,
              color: "text-emerald-700 bg-emerald-100",
            },
            {
              label: "Client preferences",
              value: stats.client_preferences,
              detail: "Explicit signals only",
              icon: UsersRound,
              color: "text-blue-700 bg-blue-100",
            },
            {
              label: "Last learned",
              value: profile?.last_learned_at ? "Current" : "Not yet",
              detail: formatDate(profile?.last_learned_at),
              icon: Clock3,
              color: "text-amber-700 bg-amber-100",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-bold text-neutral-950">
                  {item.value}
                </p>
                <p className="text-xs font-semibold text-neutral-700">
                  {item.label}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  {item.detail}
                </p>
              </article>
            );
          })}
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <UserRoundCog className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-neutral-950">Your Agent DNA</h2>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                A living profile derived from messages you actually send.
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
              {profile?.learned_sample_count || 0} samples
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-neutral-950 p-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
              Voice summary
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-100">
              {profile?.style_summary ||
                "Clippy needs a few approved or sent messages before it can describe your voice."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {learnedTone && (
                <span className="rounded-full bg-white/10 px-2.5 py-1">
                  {learnedTone}
                </span>
              )}
              {profile?.average_message_words ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1">
                  ~{profile.average_message_words} words
                </span>
              ) : null}
              {(profile?.common_greetings || []).slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/10 px-2.5 py-1"
                >
                  Opens “{item}”
                </span>
              ))}
              {(profile?.common_signoffs || []).slice(0, 2).map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/10 px-2.5 py-1"
                >
                  Signs off “{item}”
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(styleRules)
              .filter(
                ([key, value]) =>
                  key !== "explicit" && typeof value === "string" && value,
              )
              .slice(0, 6)
              .map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    {titleCase(key)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-700">
                    {String(value)}
                  </p>
                </div>
              ))}
          </div>

          {(explicitRules.length > 0 ||
            (profile?.avoid_phrases || []).length > 0) && (
            <div className="mt-4 space-y-2">
              {explicitRules.map((rule) => (
                <div
                  key={rule}
                  className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {rule}
                </div>
              ))}
              {(profile?.avoid_phrases || []).map((rule) => (
                <div
                  key={rule}
                  className="flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-900"
                >
                  <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                  Never use: {rule}
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-violet-600" />
              <h2 className="font-bold text-neutral-950">Learning controls</h2>
              {saving && (
                <LoaderCircle className="ml-auto h-4 w-4 animate-spin text-neutral-400" />
              )}
            </div>
            <div className="mt-2">
              <SettingRow
                title="Learn from Gmail Sent"
                description="Backfill the last 180 days, then learn from new sent messages during the regular Gmail sync."
                checked={settings.learn_from_sent}
                disabled={!settings.learning_enabled || saving}
                onChange={(learn_from_sent) =>
                  void updateSettings({ learn_from_sent })
                }
              />
              <SettingRow
                title="Learn from approved drafts"
                description="An approved final message becomes a positive voice example."
                checked={settings.learn_from_approved}
                disabled={!settings.learning_enabled || saving}
                onChange={(learn_from_approved) =>
                  void updateSettings({ learn_from_approved })
                }
              />
              <SettingRow
                title="Learn from my edits"
                description="Compare the proposed draft with your final version to refine Agent DNA."
                checked={settings.learn_from_corrections}
                disabled={!settings.learning_enabled || saving}
                onChange={(learn_from_corrections) =>
                  void updateSettings({ learn_from_corrections })
                }
              />
              <SettingRow
                title="Remember client preferences"
                description="Record explicit signals such as “please text me” or “keep it brief”—not guesses."
                checked={settings.learn_client_preferences}
                disabled={!settings.learning_enabled || saving}
                onChange={(learn_client_preferences) =>
                  void updateSettings({ learn_client_preferences })
                }
              />
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-neutral-700">
                How Clippy applies learning
              </span>
              <div className="relative mt-2">
                <select
                  value={
                    settings.automation_level === "trusted"
                      ? "draft"
                      : settings.automation_level
                  }
                  disabled={saving}
                  onChange={(event) =>
                    void updateSettings({
                      automation_level: event.target
                        .value as LearningSettings["automation_level"],
                    })
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-9 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="observe">Observe only</option>
                  <option value="assist">Suggest style</option>
                  <option value="draft">Apply to editable drafts</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-neutral-400" />
              </div>
            </label>
            <p className="mt-2 text-[11px] leading-5 text-neutral-500">
              This never bypasses review: Clippy still asks for approval before
              a client message is sent.
            </p>
          </article>

          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-neutral-950">Learning sources</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-900">
                    Gmail Sent
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    {data.gmail?.status === "connected"
                      ? settings.sent_backfill_complete
                        ? "Connected · historical learning complete"
                        : "Connected · historical learning in progress"
                      : "Connect Gmail to learn from sent email"}
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-700">
                  {stats.sources.gmail_sent || 0}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Check className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-900">
                    Reviewed messages
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">
                    Approved drafts and your final edits
                  </p>
                </div>
                <span className="text-xs font-bold text-neutral-700">
                  {(stats.sources.approved_draft || 0) +
                    (stats.sources.agent_edit || 0)}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-neutral-950">
              Teach Clippy directly
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            Explicit rules always outrank patterns inferred from examples.
          </p>
          <form onSubmit={teach} className="mt-4 space-y-3">
            <textarea
              value={guidance}
              onChange={(event) => setGuidance(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder={
                neverSay
                  ? "Example: ‘Just touching base’"
                  : "Example: Keep inspection replies under 80 words and end with one clear next step."
              }
              className="w-full resize-y rounded-xl border border-neutral-200 p-3 text-sm leading-6 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={neverSay}
                  onChange={(event) => setNeverSay(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-red-600"
                />
                This is a “never say” phrase or rule
              </label>
              <button
                disabled={saving || !guidance.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <BrainCircuit className="h-4 w-4" />
                )}
                Add to Agent DNA
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800">
            <FileLock2 className="h-5 w-5" />
            <h2 className="font-bold">Private by design</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-xs font-semibold text-neutral-900">
                Agent-private examples
              </p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-600">
                Another team member cannot retrieve your personal voice
                examples.
              </p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <Eye className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-xs font-semibold text-neutral-900">
                Sanitised before storage
              </p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-600">
                Names, contacts, links, addresses, dates and amounts become
                placeholders.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-emerald-900/70">
            Clippy never uses a style example as a source of property or client
            facts. Raw examples retained: no.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowExamples((value) => !value)}
          className="flex w-full items-center gap-3 p-5 text-left"
        >
          <History className="h-5 w-5 text-violet-600" />
          <div className="flex-1">
            <h2 className="font-bold text-neutral-950">
              Sanitised voice examples
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Inspect exactly what Clippy can imitate and exclude anything you
              do not want used.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
            {activeExamples.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-neutral-400 transition ${showExamples ? "rotate-180" : ""}`}
          />
        </button>
        {showExamples && (
          <div className="border-t p-5">
            <div className="grid gap-3 lg:grid-cols-2">
              {data.examples.slice(0, 24).map((example) => (
                <article
                  key={example.id}
                  className={`rounded-xl border p-4 ${example.excluded ? "bg-neutral-50 opacity-60" : "bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
                        {sourceLabels[example.source] ||
                          titleCase(example.source)}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">
                        {titleCase(example.situation)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleExample(example)}
                      className="shrink-0 text-[11px] font-semibold text-neutral-500 hover:text-red-600"
                    >
                      {example.excluded ? "Restore" : "Exclude"}
                    </button>
                  </div>
                  {example.subject && (
                    <p className="mt-3 text-xs font-semibold text-neutral-900">
                      {example.subject}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-6 whitespace-pre-line text-xs leading-5 text-neutral-600">
                    {example.content}
                  </p>
                  <p className="mt-3 text-[10px] text-neutral-400">
                    {formatDate(example.occurred_at)} · sanitised
                  </p>
                </article>
              ))}
            </div>
            {data.examples.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
                No voice examples yet. Choose “Learn now” to begin the Gmail
                Sent backfill.
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowClients((value) => !value)}
          className="flex w-full items-center gap-3 p-5 text-left"
        >
          <UsersRound className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <h2 className="font-bold text-neutral-950">
              Client communication preferences
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Structured preferences learned only from explicit client language.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
            {data.clients.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-neutral-400 transition ${showClients ? "rotate-180" : ""}`}
          />
        </button>
        {showClients && (
          <div className="grid gap-3 border-t p-5 md:grid-cols-2 xl:grid-cols-3">
            {data.clients.map((client) => {
              const preferences = [
                client.communication_preference,
                client.tone_preference,
                client.length_preference,
                client.language_preference,
                client.reminder_preference,
              ].filter(Boolean);
              return (
                <article key={client.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {client.client_name}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {client.preference_confidence}% confidence
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preferences.map((preference) => (
                      <span
                        key={preference}
                        className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                      >
                        {titleCase(String(preference))}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-neutral-400">
                    {client.preference_evidence_count} explicit signal
                    {client.preference_evidence_count === 1 ? "" : "s"} ·{" "}
                    {formatDate(client.last_preference_evidence_at)}
                  </p>
                </article>
              );
            })}
            {data.clients.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-neutral-500">
                No explicit client communication preferences detected yet.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-neutral-500" />
            <h2 className="font-bold text-neutral-950">
              Recent learning activity
            </h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.events.slice(0, 9).map((event) => (
              <div key={event.id} className="rounded-xl bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-neutral-800">
                  {eventLabels[event.event_type] || titleCase(event.event_type)}
                </p>
                {event.guidance_text && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-neutral-600">
                    {event.guidance_text}
                  </p>
                )}
                <p className="mt-2 text-[10px] text-neutral-400">
                  {formatDate(event.created_at)}
                </p>
              </div>
            ))}
            {data.events.length === 0 && (
              <p className="text-sm text-neutral-500">
                No feedback activity yet.
              </p>
            )}
          </div>
        </article>
        <article className="flex min-w-64 flex-col justify-between rounded-2xl border border-red-100 bg-red-50/50 p-5">
          <div>
            <Trash2 className="h-5 w-5 text-red-500" />
            <h2 className="mt-3 font-bold text-neutral-950">Reset Agent DNA</h2>
            <p className="mt-1 max-w-xs text-xs leading-5 text-neutral-600">
              Deletes learned voice examples and feedback. It does not delete
              Gmail or client records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void resetProfile()}
            disabled={saving}
            className="mt-5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Reset learned profile
          </button>
        </article>
      </section>
    </main>
  );
}
