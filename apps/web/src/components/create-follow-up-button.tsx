"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, Loader2, X } from "lucide-react";

type Props = {
  leadId?: string;
  listingId?: string;
  defaultTitle: string;
};

const DELAYS = [
  { label: "In 1 hour", milliseconds: 60 * 60 * 1000 },
  { label: "Tomorrow", milliseconds: 24 * 60 * 60 * 1000 },
  { label: "In 3 days", milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { label: "In 1 week", milliseconds: 7 * 24 * 60 * 60 * 1000 },
];

export function CreateFollowUpButton({
  leadId,
  listingId,
  defaultTitle,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [delay, setDelay] = useState(String(DELAYS[1].milliseconds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          due_at: new Date(Date.now() + Number(delay)).toISOString(),
          lead_id: leadId,
          listing_id: listingId,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Unable to save follow-up");
      setMessage("Follow-up created");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to save follow-up",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          <BellPlus className="h-4 w-4" />
          Add follow-up
        </button>
        {message && <span className="text-xs text-emerald-700">{message}</span>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-900">
          New follow-up
        </span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close">
          <X className="h-4 w-4 text-emerald-700" />
        </button>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={160}
        className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
        aria-label="Follow-up title"
      />
      <select
        value={delay}
        onChange={(event) => setDelay(event.target.value)}
        className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
        aria-label="Follow-up time"
      >
        {DELAYS.map((option) => (
          <option key={option.label} value={option.milliseconds}>
            {option.label}
          </option>
        ))}
      </select>
      {message && <p className="mt-2 text-xs text-red-700">{message}</p>}
      <button
        type="button"
        disabled={saving || title.trim().length < 2}
        onClick={() => void save()}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save follow-up
      </button>
    </div>
  );
}
