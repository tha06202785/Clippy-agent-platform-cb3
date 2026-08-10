"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Trash2 } from "lucide-react";

const DELAYS = [
  { label: "Reschedule", milliseconds: 0 },
  { label: "In 1 hour", milliseconds: 60 * 60 * 1000 },
  { label: "Tomorrow", milliseconds: 24 * 60 * 60 * 1000 },
  { label: "In 3 days", milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { label: "In 1 week", milliseconds: 7 * 24 * 60 * 60 * 1000 },
];

export function FollowUpActions({
  taskId,
  copilotHref,
}: {
  taskId: string;
  copilotHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = async (action: "complete" | "reschedule", delay?: number) => {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(delay
            ? { due_at: new Date(Date.now() + delay).toISOString() }
            : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Unable to update follow-up");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update follow-up",
      );
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this follow-up?")) return;
    setBusy("cancel");
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Unable to cancel follow-up");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to cancel follow-up",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void update("complete")}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
      >
        {busy === "complete" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Complete
      </button>
      <select
        defaultValue="0"
        disabled={busy !== null}
        onChange={(event) => {
          const delay = Number(event.target.value);
          if (delay) void update("reschedule", delay);
          event.target.value = "0";
        }}
        className="rounded-lg border bg-white px-2 py-1.5 text-[11px] font-bold text-neutral-700"
        aria-label="Reschedule follow-up"
      >
        {DELAYS.map((option) => (
          <option key={option.label} value={option.milliseconds}>
            {option.label}
          </option>
        ))}
      </select>
      <Link
        href={copilotHref}
        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700"
      >
        <Sparkles className="h-3 w-3" />
        Draft follow-up
      </Link>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void cancel()}
        className="ml-auto rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        aria-label="Cancel follow-up"
      >
        {busy === "cancel" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
      {error && <p className="w-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
