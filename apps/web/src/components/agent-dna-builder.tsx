"use client";

import { useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDashed,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Sparkles,
} from "lucide-react";
import type {
  AgentDnaDefinition,
  AgentDnaSection,
  AgentDnaSectionKey,
} from "@/lib/agent-dna";

type AgentDnaData = {
  definitions: AgentDnaDefinition[];
  sections: AgentDnaSection[];
  confirmed: number;
  total: number;
};

type Draft = {
  sectionKey: AgentDnaSectionKey;
  summary: string;
  rules: string;
  goals: string;
  agentNotes: string;
};

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function sectionStatus(section?: AgentDnaSection) {
  if (section?.status === "confirmed") {
    return {
      label: "Confirmed & active",
      className: "bg-emerald-100 text-emerald-800",
      icon: Check,
    };
  }
  if (section?.status === "draft") {
    return {
      label: "Review suggested",
      className: "bg-amber-100 text-amber-800",
      icon: Pencil,
    };
  }
  return {
    label: "Needs your input",
    className: "bg-neutral-100 text-neutral-700",
    icon: CircleDashed,
  };
}

export function AgentDnaBuilder({
  dna,
  onAction,
}: {
  dna: AgentDnaData;
  onAction: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<AgentDnaSectionKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sectionByKey = new Map(
    dna.sections.map((section) => [section.section_key, section]),
  );
  const progress = dna.total
    ? Math.round((dna.confirmed / dna.total) * 100)
    : 0;

  function openEditor(definition: AgentDnaDefinition) {
    const section = sectionByKey.get(definition.key);
    setExpanded((current) =>
      current === definition.key ? null : definition.key,
    );
    setDraft({
      sectionKey: definition.key,
      summary: section?.summary || "",
      rules: (section?.rules || []).join("\n"),
      goals: (section?.goals || []).join("\n"),
      agentNotes: section?.agent_notes || "",
    });
    setError("");
  }

  async function buildDna() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onAction({ action: "build_dna" });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Agent DNA could not be prepared",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(status: "draft" | "confirmed") {
    if (!draft || busy) return;
    if (draft.summary.trim().length < 10) {
      setError("Add a short summary of at least 10 characters before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onAction({
        action: "save_dna_section",
        section_key: draft.sectionKey,
        summary: draft.summary.trim(),
        rules: lines(draft.rules),
        goals: lines(draft.goals),
        agent_notes: draft.agentNotes.trim(),
        status,
      });
      setExpanded(null);
      setDraft(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Agent DNA could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-neutral-950 via-violet-950 to-neutral-950 p-5 text-white md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10">
              <BrainCircuit className="h-5 w-5 text-violet-200" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
                Personal AI clone
              </p>
              <h2 className="mt-1 text-xl font-bold">
                Your complete Agent DNA
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-300">
                Ten reviewable areas control how Clippy writes, recommends and
                works. Suggestions remain inactive until you confirm them.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void buildDna()}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-neutral-950 hover:bg-violet-100 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {dna.sections.length ? "Refresh suggestions" : "Build my Agent DNA"}
          </button>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span>
              {dna.confirmed} of {dna.total} sections confirmed
            </span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-px bg-neutral-100 lg:grid-cols-2">
        {dna.definitions.map((definition) => {
          const section = sectionByKey.get(definition.key);
          const status = sectionStatus(section);
          const StatusIcon = status.icon;
          const isExpanded = expanded === definition.key;
          return (
            <article key={definition.key} className="bg-white p-4 md:p-5">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`dna-${definition.key}`}
                onClick={() => openEditor(definition)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-xs font-black text-violet-700">
                  {definition.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-neutral-950">
                      {definition.shortTitle}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-500">
                    {definition.description}
                  </span>
                </span>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-neutral-400 transition ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && draft?.sectionKey === definition.key ? (
                <div
                  id={`dna-${definition.key}`}
                  className="mt-4 space-y-4 border-t pt-4"
                >
                  <div className="rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-900">
                    <span className="font-bold">Guided question: </span>
                    {definition.question}
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-700">
                      DNA summary
                    </span>
                    <textarea
                      value={draft.summary}
                      onChange={(event) =>
                        setDraft({ ...draft, summary: event.target.value })
                      }
                      rows={4}
                      maxLength={1500}
                      placeholder={definition.placeholder}
                      className="mt-2 w-full resize-y rounded-xl border p-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-neutral-700">
                        Rules, one per line
                      </span>
                      <textarea
                        value={draft.rules}
                        onChange={(event) =>
                          setDraft({ ...draft, rules: event.target.value })
                        }
                        rows={5}
                        maxLength={3600}
                        className="mt-2 w-full resize-y rounded-xl border p-3 text-xs leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-neutral-700">
                        Goals, one per line
                      </span>
                      <textarea
                        value={draft.goals}
                        onChange={(event) =>
                          setDraft({ ...draft, goals: event.target.value })
                        }
                        rows={5}
                        maxLength={3600}
                        className="mt-2 w-full resize-y rounded-xl border p-3 text-xs leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-neutral-700">
                      Private notes for Clippy
                    </span>
                    <textarea
                      value={draft.agentNotes}
                      onChange={(event) =>
                        setDraft({ ...draft, agentNotes: event.target.value })
                      }
                      rows={3}
                      maxLength={2000}
                      className="mt-2 w-full resize-y rounded-xl border p-3 text-xs leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => void save("draft")}
                      disabled={busy}
                      className="min-h-11 rounded-xl border px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void save("confirmed")}
                      disabled={busy}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {busy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                      Confirm & activate
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <div className="border-t bg-emerald-50/60 p-4 text-xs leading-5 text-emerald-900">
        Confirmed DNA guides drafts and recommendations only. It cannot override
        verified property facts, Australian compliance safeguards, agency
        policies or your current instruction.
      </div>
    </section>
  );
}
