"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function PilotAcceptance({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/activate", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        next?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Pilot access could not be activated");
      router.replace(payload.next || "/onboarding?pilot=1");
      router.refresh();
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Pilot access could not be activated",
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <BrandLogo size={56} priority className="mx-auto" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Private pilot invitation
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            Try Clippy free for 14 days
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This invitation is secured to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        <div className="mt-6 space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
          {[
            "Your own private Clippy workspace",
            "No card or payment required",
            "Access ends automatically after 14 days",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void activate()}
          disabled={loading}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Activate my private pilot
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </main>
  );
}
