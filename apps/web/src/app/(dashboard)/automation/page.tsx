"use client";
import { useEffect, useState } from "react";
import { Loader2, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";

export default function AutomationPage() {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/automation", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPaused(Boolean(d.ai_paused)))
      .catch(() => setError("Automation status could not be loaded"))
      .finally(() => setLoading(false));
  }, []);
  const change = async () => {
    setSaving(true);
    setError(null);
    const next = !paused;
    try {
      const r = await fetch("/api/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: next }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPaused(Boolean(d.ai_paused));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border bg-gradient-to-br from-white via-purple-50 to-emerald-50 p-8 shadow-soft">
        <ShieldCheck className="h-9 w-9 text-purple-700" />
        <h1 className="mt-4 text-3xl font-bold">Automation Safety Centre</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Agency control over Clippy automation. Customer-facing messages remain
          draft-and-approve.
        </p>
      </section>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      <section
        className={`rounded-3xl border p-6 shadow-soft ${paused ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">
              Current status
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {paused ? "AI automation paused" : "AI automation active"}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {paused
                ? "Clippy will not run automated AI actions until resumed."
                : "Safe internal automation may run; external replies still require approval."}
            </p>
          </div>
          <button
            disabled={saving}
            onClick={() => void change()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : paused ? (
              <PlayCircle className="h-5 w-5" />
            ) : (
              <PauseCircle className="h-5 w-5" />
            )}
            {paused ? "Resume automation" : "Pause automation"}
          </button>
        </div>
      </section>
    </main>
  );
}
