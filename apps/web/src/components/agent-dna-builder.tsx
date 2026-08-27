"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDashed,
  Eye,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  AgentDnaDefinition,
  AgentDnaSection,
  AgentDnaSectionKey,
} from "@/lib/agent-dna";
import {
  AGENT_DNA_APPROVAL_OPTIONS,
  AGENT_DNA_CONVERSION_STYLE_OPTIONS,
  AGENT_DNA_GROWTH_GOAL_OPTIONS,
  AGENT_DNA_RESPONSE_LENGTH_OPTIONS,
  AGENT_DNA_ROLE_OPTIONS,
  AGENT_DNA_VOICE_STYLE_OPTIONS,
  buildAgentDnaPreviews,
  type AgentDnaTemplateChoices,
} from "@/lib/agent-dna-templates";

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

type QuickChoiceKey = keyof AgentDnaTemplateChoices;

type QuickSetupStep = {
  key: QuickChoiceKey;
  eyebrow: string;
  question: string;
  help: string;
  options: readonly {
    value: string;
    label: string;
    description: string;
    recommended?: boolean;
  }[];
};

const QUICK_SETUP_STEPS: readonly QuickSetupStep[] = [
  {
    key: "role",
    eyebrow: "Your work",
    question: "What type of real-estate work best describes you?",
    help: "This adjusts Clippy’s audience, priorities and everyday examples.",
    options: AGENT_DNA_ROLE_OPTIONS,
  },
  {
    key: "voice_style",
    eyebrow: "Your voice",
    question: "How should Clippy sound when representing you?",
    help: "You’ll preview the selected style before anything is saved.",
    options: AGENT_DNA_VOICE_STYLE_OPTIONS,
  },
  {
    key: "response_length",
    eyebrow: "Message length",
    question: "How much detail do you usually want?",
    help: "Clippy can still add detail when risk or complexity requires it.",
    options: AGENT_DNA_RESPONSE_LENGTH_OPTIONS,
  },
  {
    key: "conversion_style",
    eyebrow: "Client guidance",
    question: "How should Clippy guide genuine interest forward?",
    help: "Every option prohibits invented urgency and pushy tactics.",
    options: AGENT_DNA_CONVERSION_STYLE_OPTIONS,
  },
  {
    key: "approval_level",
    eyebrow: "Your control",
    question: "Which approval boundary fits your way of working?",
    help: "Agent DNA never grants automation permission by itself.",
    options: AGENT_DNA_APPROVAL_OPTIONS,
  },
  {
    key: "growth_goal",
    eyebrow: "Your priority",
    question: "What should Clippy help you strengthen first?",
    help: "This shapes long-term recommendations, not short-term pressure.",
    options: AGENT_DNA_GROWTH_GOAL_OPTIONS,
  },
];

function hasQuickAnswers(
  answers: Partial<AgentDnaTemplateChoices>,
): answers is AgentDnaTemplateChoices {
  return Boolean(
    answers.role &&
    answers.voice_style &&
    answers.response_length &&
    answers.conversion_style &&
    answers.approval_level &&
    answers.growth_goal,
  );
}

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
  const [notice, setNotice] = useState("");
  const [guidedOpen, setGuidedOpen] = useState(dna.confirmed === 0);
  const [quickStep, setQuickStep] = useState(0);
  const [quickAnswers, setQuickAnswers] = useState<
    Partial<AgentDnaTemplateChoices>
  >({});
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
    setNotice("");
    try {
      await onAction({ action: "build_dna" });
      setNotice(
        "Suggestions are ready for review. Nothing becomes active until you confirm it.",
      );
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
    setNotice("");
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
      setNotice(
        status === "confirmed"
          ? "This section is now confirmed and active."
          : "Draft saved for later review.",
      );
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

  function chooseQuickAnswer(key: QuickChoiceKey, value: string) {
    setQuickAnswers(
      (current) =>
        ({ ...current, [key]: value }) as Partial<AgentDnaTemplateChoices>,
    );
    setError("");
  }

  async function applyQuickSetup() {
    if (!hasQuickAnswers(quickAnswers) || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await onAction({ action: "apply_dna_template", ...quickAnswers });
      setGuidedOpen(false);
      setQuickStep(0);
      setExpanded(null);
      setDraft(null);
      setNotice(
        "Your guided template created reviewable drafts. Confirmed sections were kept unchanged.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The guided Agent DNA could not be prepared",
      );
    } finally {
      setBusy(false);
    }
  }

  const currentQuickSetupStep = QUICK_SETUP_STEPS[quickStep] || null;
  const quickPreviews = hasQuickAnswers(quickAnswers)
    ? buildAgentDnaPreviews(quickAnswers)
    : [];

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

      {notice ? (
        <div
          role="status"
          className="border-b border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </div>
      ) : null}

      <div className="border-b bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 md:p-6">
        {!guidedOpen ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                <BookOpenCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-950">
                  Prefer not to write from scratch?
                </p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-600">
                  Answer six quick questions. Clippy will prepare ten
                  real-estate-specific drafts and show how your selected voice
                  sounds.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuidedOpen(true);
                setQuickStep(0);
                setError("");
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 text-xs font-bold text-white hover:bg-violet-800"
            >
              <Sparkles className="h-4 w-4" />
              Start guided setup
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-800">
                    Guided Agent DNA
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {currentQuickSetupStep
                      ? `Question ${quickStep + 1} of ${QUICK_SETUP_STEPS.length}`
                      : "Preview & create"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">
                  Templates remain drafts until you personally confirm each
                  section. Existing confirmed DNA will not be replaced.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close guided setup"
                onClick={() => setGuidedOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white text-neutral-500 hover:bg-neutral-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{
                  width: `${Math.round(
                    ((quickStep + 1) / (QUICK_SETUP_STEPS.length + 1)) * 100,
                  )}%`,
                }}
              />
            </div>

            {currentQuickSetupStep ? (
              <fieldset className="mt-6">
                <legend className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                    {currentQuickSetupStep.eyebrow}
                  </span>
                  <span className="mt-1 block text-lg font-bold text-neutral-950 md:text-xl">
                    {currentQuickSetupStep.question}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-500">
                    {currentQuickSetupStep.help}
                  </span>
                </legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {currentQuickSetupStep.options.map((option) => {
                    const selected =
                      quickAnswers[currentQuickSetupStep.key] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          chooseQuickAnswer(
                            currentQuickSetupStep.key,
                            option.value,
                          )
                        }
                        className={`relative min-h-24 rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                            : "border-neutral-200 bg-white hover:border-violet-300"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-bold text-neutral-950">
                            {option.label}
                          </span>
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                              selected
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-neutral-300 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-500">
                          {option.description}
                        </span>
                        {option.recommended ? (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                            Good starting point
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setQuickStep((current) => current - 1)}
                    disabled={quickStep === 0}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:invisible"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStep((current) => current + 1)}
                    disabled={!quickAnswers[currentQuickSetupStep.key]}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-xs font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {quickStep === QUICK_SETUP_STEPS.length - 1
                      ? "Preview my style"
                      : "Next"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </fieldset>
            ) : (
              <div className="mt-6">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Eye className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-emerald-950">
                      Does this sound like you?
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-emerald-900">
                      These are illustrative drafts—property facts, names and
                      availability must still be verified before use.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {quickPreviews.map((preview) => (
                    <article
                      key={preview.title}
                      className="rounded-2xl border bg-white p-4"
                    >
                      <p className="text-xs font-bold text-neutral-950">
                        {preview.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                        {preview.situation}
                      </p>
                      <p className="mt-3 text-xs leading-5 text-neutral-700">
                        “{preview.content}”
                      </p>
                    </article>
                  ))}
                </div>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setQuickStep(QUICK_SETUP_STEPS.length - 1)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Adjust my choices
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyQuickSetup()}
                    disabled={busy || !hasQuickAnswers(quickAnswers)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Create my 10 review drafts
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                  <div>
                    <p className="text-xs font-bold text-neutral-700">
                      Need a starting point? Use an example
                    </p>
                    <div className="mt-2 grid gap-2">
                      {definition.examples.map((example, index) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() =>
                            setDraft({ ...draft, summary: example })
                          }
                          className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-3 text-left text-xs leading-5 text-neutral-700 hover:border-violet-400 hover:bg-violet-50"
                        >
                          <span className="font-bold text-violet-700">
                            Example {index + 1}:
                          </span>{" "}
                          {example}
                        </button>
                      ))}
                    </div>
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
