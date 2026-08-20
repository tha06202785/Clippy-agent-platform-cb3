"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button, Input, Textarea } from "@clippy/ui";
import {
  buildDraftLaunchUrl,
  type ProposedDraftAction,
  type ProposedInspectionSlotAction,
} from "@/lib/copilot-actions";
import type { CopilotContextSelection } from "@/lib/copilot-context";

export type InspectionSlotActionState = ProposedInspectionSlotAction & {
  status: "pending" | "creating" | "created";
  error?: string;
  slotId?: string;
};

export type DraftActionState = ProposedDraftAction & {
  context: CopilotContextSelection;
  status: "draft" | "approving" | "approved";
  error?: string;
  approvedAt?: string;
  sent?: boolean;
};

export function DraftApprovalCard({
  action,
  onChange,
  onApprove,
}: {
  action: DraftActionState;
  onChange: (patch: Partial<DraftActionState>) => void;
  onApprove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const launchUrl = buildDraftLaunchUrl(action);
  const channelLabel =
    action.channel === "sms"
      ? "Text"
      : action.channel === "whatsapp"
        ? "WhatsApp"
        : action.channel === "email"
          ? "Email"
          : "Copy";

  const copyDraft = async () => {
    await navigator.clipboard.writeText(action.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const openDraft = () => {
    if (!launchUrl) return;
    if (launchUrl.startsWith("https://")) {
      window.open(launchUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.location.href = launchUrl;
  };

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20"
      aria-label="Draft approval"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 px-4 py-3 dark:border-amber-900/60">
        <div>
          <div className="flex items-center gap-2">
            <Mail
              className="h-4 w-4 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-foreground">
              {action.title}
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {action.status === "approved"
              ? action.sent
                ? "Approved and delivered through the connected channel"
                : "Approved and ready for your final send"
              : "Review and edit before approval"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] ${action.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}
        >
          {action.status === "approved"
            ? action.sent
              ? "Sent"
              : "Approved"
            : "Approval required"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {action.adaptiveIntelligence ? (
          <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-xs text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-100">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Adapted to your Agent DNA</p>
              <p className="mt-0.5 text-[11px] leading-5 text-violet-700 dark:text-violet-300">
                {action.adaptiveIntelligence.examplesUsed > 0
                  ? `${action.adaptiveIntelligence.examplesUsed} similar sanitised example${action.adaptiveIntelligence.examplesUsed === 1 ? "" : "s"}`
                  : "Learned style profile"}
                {action.adaptiveIntelligence.clientPreferences.length > 0
                  ? ` · ${action.adaptiveIntelligence.clientPreferences.length} client preference${action.adaptiveIntelligence.clientPreferences.length === 1 ? "" : "s"}`
                  : ""}
                {` · ${action.adaptiveIntelligence.profileConfidence}% confidence`}
              </p>
            </div>
          </div>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Channel
            </dt>
            <dd className="mt-1 text-xs font-semibold text-foreground">
              {channelLabel}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Recipient
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold text-foreground">
              {action.recipient.name ||
                action.recipient.email ||
                action.recipient.phone ||
                "No recipient selected"}
            </dd>
          </div>
        </dl>

        {action.channel === "email" ? (
          <label className="block text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Subject
            <Input
              value={action.subject || ""}
              onChange={(event) => onChange({ subject: event.target.value })}
              disabled={action.status === "approved"}
              className="mt-1 font-normal normal-case tracking-normal"
            />
          </label>
        ) : null}

        <label className="block text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Draft
          <Textarea
            value={action.content}
            onChange={(event) => onChange({ content: event.target.value })}
            disabled={action.status === "approved"}
            rows={7}
            className="mt-1 font-normal normal-case leading-6 tracking-normal"
          />
        </label>

        {action.error ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {action.error}
          </p>
        ) : null}

        {action.status === "approved" ? (
          <div className="space-y-2">
            {action.sent ? (
              <div
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Delivered successfully. Clippy recorded your final version for
                learning.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {launchUrl ? (
                  <Button className="flex-1" onClick={openDraft}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open{" "}
                    {channelLabel}
                  </Button>
                ) : null}
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => void copyDraft()}
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />{" "}
                  {copied ? "Copied" : "Copy approved text"}
                </Button>
              </div>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              {action.sent
                ? "Delivery is recorded in the selected conversation."
                : "Approval is recorded. Opening the channel does not mean the message has been sent."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              className="w-full"
              variant="secondary"
              onClick={onApprove}
              isLoading={action.status === "approving"}
              loadingText="Recording approval…"
              disabled={!action.content.trim()}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
              this draft
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Nothing is sent when you approve. You choose the final send in
              your email or messaging app.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function InspectionSlotApprovalCard({
  action,
  onChange,
  onApprove,
}: {
  action: InspectionSlotActionState;
  onChange: (patch: Partial<InspectionSlotActionState>) => void;
  onApprove: () => void;
}) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-AU", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Australia/Melbourne",
    }).format(new Date(value));
  const proposedSlots = action.slots?.length
    ? action.slots
    : [
        {
          startsAt: action.startsAt,
          endsAt: action.endsAt,
          conflicts: action.conflicts,
          alternativeSlots: action.alternativeSlots,
        },
      ];
  const unresolvedConflicts = proposedSlots.reduce(
    (total, slot) => total + slot.conflicts.length,
    0,
  );
  const selectAlternative = (
    index: number,
    alternative: { startsAt: string; endsAt: string },
  ) => {
    const slots = proposedSlots.map((slot, slotIndex) =>
      slotIndex === index
        ? { ...slot, ...alternative, conflicts: [], alternativeSlots: [] }
        : slot,
    );
    onChange({
      slots,
      ...(index === 0
        ? {
            startsAt: alternative.startsAt,
            endsAt: alternative.endsAt,
            conflicts: [],
            alternativeSlots: [],
          }
        : {}),
      error: undefined,
    });
  };

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
      aria-label="Inspection slot approval"
    >
      <div className="flex items-center justify-between gap-3 border-b border-emerald-200 px-4 py-3 dark:border-emerald-900/60">
        <div className="flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4 text-emerald-700 dark:text-emerald-400"
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-foreground">
            {action.title}
          </h3>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {action.status === "created" ? "Created" : "Approval required"}
        </span>
      </div>
      <div className="space-y-3 p-4 text-sm text-foreground">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Property
          </p>
          <p className="font-semibold">{action.propertyAddress}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {proposedSlots.length === 1
              ? "Time"
              : `${proposedSlots.length} inspection times`}
          </p>
          <div className="mt-2 space-y-2">
            {proposedSlots.map((slot, index) => (
              <div
                key={`${slot.startsAt}:${index}`}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{format(slot.startsAt)}</p>
                  <span
                    className={`text-[10px] font-semibold uppercase ${slot.conflicts.length ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}
                  >
                    {slot.conflicts.length ? "Conflict" : "Available"}
                  </span>
                </div>
                {slot.conflicts.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                      {slot.conflicts[0].title || "Calendar conflict"} — choose
                      another time:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {slot.alternativeSlots.map((alternative) => (
                        <Button
                          key={alternative.startsAt}
                          size="sm"
                          variant="outline"
                          onClick={() => selectAlternative(index, alternative)}
                        >
                          {new Intl.DateTimeFormat("en-AU", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "Australia/Melbourne",
                          }).format(new Date(alternative.startsAt))}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            30 minutes each · capacity {action.capacity}
          </p>
        </div>
        {action.error ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {action.error}
          </p>
        ) : null}
        {action.status === "created" ? (
          <p
            className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {proposedSlots.length === 1
              ? "Inspection slot"
              : `${proposedSlots.length} inspection slots`}{" "}
            published and recorded.
          </p>
        ) : (
          <Button
            className="w-full"
            variant="secondary"
            onClick={onApprove}
            isLoading={action.status === "creating"}
            loadingText="Creating slot…"
            disabled={unresolvedConflicts > 0}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {proposedSlots.length === 1
              ? "Approve and create slot"
              : `Approve and create ${proposedSlots.length} slots`}
          </Button>
        )}
        <p className="text-center text-[11px] text-muted-foreground">
          Clippy will re-check conflicts immediately before creation.
        </p>
      </div>
    </section>
  );
}
