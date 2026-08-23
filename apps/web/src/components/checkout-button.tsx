"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { PaidPlanId } from "@/lib/billing";

type CheckoutButtonProps = {
  plan: PaidPlanId;
  children: React.ReactNode;
  className?: string;
  unauthenticatedPath?: string;
};

export function CheckoutButton({
  plan,
  children,
  className,
  unauthenticatedPath = `/signup?plan=${plan}`,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.location.assign(unauthenticatedPath);
        return;
      }
      if (!response.ok || !result.url) {
        throw new Error(
          response.status === 503
            ? "Online checkout is being enabled. Your workspace is saved—contact us for assisted activation."
            : result.error || "Checkout could not be started.",
        );
      }

      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be started.",
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        aria-busy={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {children}
        {!loading ? (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        ) : null}
      </button>
      {error ? (
        <p
          className="mt-3 max-w-md text-sm leading-6 text-amber-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
