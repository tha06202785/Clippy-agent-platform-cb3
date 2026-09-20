"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Zap } from "lucide-react";
import type { DashboardRecommendation } from "@/lib/dashboard-intelligence";

export function NextBestActions({
  items,
  onTaskCompleted,
}: {
  items: DashboardRecommendation[];
  onTaskCompleted: () => void;
}) {
  const [visibleItems, setVisibleItems] = useState(items);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setVisibleItems(items), [items]);

  const completeTask = async (taskId: string) => {
    setBusyTask(taskId);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to complete this action");
      }
      setVisibleItems((current) =>
        current.filter((item) => item.task_id !== taskId),
      );
      onTaskCompleted();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to complete this action",
      );
    } finally {
      setBusyTask(null);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-700">
            Next best actions
          </p>
          <h2 className="mt-1 text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-neutral-900">
            Work the list from top to bottom
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-neutral-500">
            Live tasks and opportunities ordered by urgency, deadline and
            intent.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          <Zap className="h-4 w-4" />
          {visibleItems.length}
        </div>
      </div>

      <div className="mt-5 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
        {visibleItems.map((item, index) => (
          <article
            key={item.id}
            className="grid gap-3 bg-white p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-4"
          >
            <div className="flex items-center gap-3 md:block">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] md:mt-2 md:inline-block ${
                  item.priority === "urgent"
                    ? "bg-red-100 text-red-700"
                    : item.priority === "high"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {item.priority}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">
                {item.reason}
              </p>
              <h3 className="mt-1 text-base font-semibold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-neutral-600">
                {item.detail}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {item.task_id && (
                <button
                  type="button"
                  disabled={busyTask !== null}
                  onClick={() => void completeTask(item.task_id!)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {busyTask === item.task_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Complete
                </button>
              )}
              <Link
                href={item.href}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {item.action}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
