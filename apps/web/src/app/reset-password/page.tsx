"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/password-reset";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

type RecoveryState = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [state, setState] = useState<RecoveryState>("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      setState(!userError && data.user ? "ready" : "invalid");
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError("We could not update your password. Request a new link.");
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      setState("success");
    } catch {
      setError("We could not update your password. Request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistSans.className} flex min-h-screen items-center justify-center bg-background px-4`}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo size={48} priority className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.02em] text-foreground">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use at least 8 characters for your new Clippy password.
          </p>
        </div>

        {error ? (
          <div
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {state === "checking" ? (
          <p
            className="text-center text-sm text-muted-foreground"
            role="status"
          >
            Checking your secure reset link…
          </p>
        ) : null}

        {state === "invalid" ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <h2 className="font-semibold text-foreground">
              This reset link is invalid or expired
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Password reset links can only be used once. Request a fresh link
              to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Request a new link
            </Link>
          </div>
        ) : null}

        {state === "ready" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-foreground"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-foreground"
              >
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : null}

        {state === "success" ? (
          <div
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center"
            role="status"
          >
            <h2 className="font-semibold text-foreground">Password updated</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your password has been changed securely. Sign in with your new
              password.
            </p>
            <Link
              href="/sign-in?reset=success"
              className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Continue to sign in
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
