"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const requestedEmail = new URLSearchParams(window.location.search).get(
      "email",
    );
    if (requestedEmail) setEmail(requestedEmail);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "We could not send the reset email.");
        return;
      }

      setSent(true);
    } catch {
      setError("We could not send the reset email. Please try again.");
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
            Reset your password
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Enter your account email and we&apos;ll send you a secure reset
            link.
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

        {sent ? (
          <div
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5"
            role="status"
          >
            <h2 className="font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              If an account exists for {email}, a password reset link is on its
              way. Check your spam folder if it does not arrive shortly.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Send another link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
