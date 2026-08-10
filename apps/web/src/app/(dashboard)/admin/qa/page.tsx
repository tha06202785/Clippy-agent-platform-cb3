"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  Rocket,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type HealthState = "healthy" | "warning" | "error";

type HealthCheck = {
  key: string;
  name: string;
  status: HealthState;
  message: string;
  latencyMs?: number;
};

type HealthResponse = {
  overall: HealthState;
  score: number;
  checkedAt: string;
  checks: HealthCheck[];
  build?: {
    commitSha: string;
    commitRef: string;
    deploymentId: string;
    environment: string;
  };
  error?: string;
};

const statusStyles: Record<HealthState, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

const nextActions: Record<string, string> = {
  authentication: "Sign out and sign in again with an Owner or Admin account.",
  release: "Deploy the latest main branch to production.",
  database: "Check Supabase availability, credentials and organisation access.",
  organisation: "Assign the signed-in user to the correct organisation.",
  knowledge: "Add approved agency knowledge before starting the pilot.",
  integrations: "Reconnect or test the affected channel in Integrations.",
  ai: "Configure a production AI provider before using Copilot.",
  automation: "Configure the automation secrets in Vercel.",
  "google-oauth": "Correct the Google OAuth credentials and redirect URL.",
  "client-360-data": "Import or add one genuine client to exercise Client 360.",
  "property-separation": "Repair enquiries missing a client or property link.",
  "copilot-context":
    "Review conversations with missing or mismatched CRM context.",
  "follow-up-workflow":
    "Add a due date and client or property to each active follow-up.",
  "crm-duplicate-protection":
    "Review repeated email and phone identities before importing again.",
  "knowledge-email-filter":
    "Review and archive emails that fail the real-estate relevance policy.",
  "automation-pause-state": "Confirm the agency-wide automation setting.",
};

function StatusIcon({
  status,
  className = "h-5 w-5",
}: {
  status: HealthState;
  className?: string;
}) {
  if (status === "healthy") return <CheckCircle2 className={className} />;
  if (status === "warning") return <AlertTriangle className={className} />;
  return <XCircle className={className} />;
}

export default function AdminQaPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/health", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Diagnostics failed");
      }

      setData(result);
    } catch (diagnosticError: any) {
      setError(diagnosticError?.message || "Unable to run diagnostics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const healthy =
    data?.checks.filter((check) => check.status === "healthy").length || 0;
  const warnings =
    data?.checks.filter((check) => check.status === "warning").length || 0;
  const failures =
    data?.checks.filter((check) => check.status === "error").length || 0;
  const attentionChecks =
    data?.checks.filter((check) => check.status !== "healthy") || [];
  const pilotState: HealthState = failures
    ? "error"
    : warnings
      ? "warning"
      : "healthy";
  const pilotLabel = failures
    ? "Not ready for pilot"
    : warnings
      ? "Ready with actions"
      : "Ready for pilot";

  const downloadReport = useCallback(() => {
    if (!data) return;
    const lines = [
      "CLIPPY PILOT READINESS REPORT",
      `Generated: ${new Date(data.checkedAt).toLocaleString("en-AU")}`,
      `Release: ${data.build?.commitRef || "unknown"} @ ${data.build?.commitSha?.slice(0, 7) || "unknown"}`,
      `Score: ${data.score}%`,
      `Verdict: ${pilotLabel}`,
      "",
      ...data.checks.flatMap((check) => [
        `[${check.status.toUpperCase()}] ${check.name}`,
        check.message,
        check.status === "healthy"
          ? ""
          : `Next action: ${nextActions[check.key] || "Investigate this check before the pilot."}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clippy-pilot-readiness-${new Date(data.checkedAt).toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, pilotLabel]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Admin diagnostics
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Clippy End-to-End QA Centre
            </h1>
            <p className="mt-2 text-muted-foreground">
              Read-only production checks across Client 360, property context,
              Copilot, reminders, CRM imports, knowledge and automation.
            </p>
          </div>

          <button
            type="button"
            onClick={runDiagnostics}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Running checks" : "Run diagnostics"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Diagnostics could not complete</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm md:col-span-1">
            <p className="text-sm font-medium text-muted-foreground">
              System health
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">{data?.score ?? "—"}</span>
              <span className="pb-1 text-muted-foreground">%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data?.score || 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Healthy
              </p>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold">{healthy}</p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Warnings
              </p>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-bold">{warnings}</p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Failures
              </p>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="mt-3 text-3xl font-bold">{failures}</p>
          </div>
        </div>

        {data && (
          <div
            className={`rounded-2xl border p-5 shadow-sm ${statusStyles[pilotState]}`}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-current/20 bg-white/60 p-2.5">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Pilot readiness decision
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{pilotLabel}</h2>
                  <p className="mt-1 text-sm opacity-90">
                    {failures
                      ? `${failures} blocker${failures === 1 ? "" : "s"} must be resolved before inviting pilot agencies.`
                      : warnings
                        ? `${warnings} action${warnings === 1 ? "" : "s"} can be completed during controlled pilot preparation.`
                        : "All live checks passed. The current release is ready for a controlled pilot."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-current/25 bg-white/70 px-4 text-sm font-semibold transition hover:bg-white"
              >
                <Download className="h-4 w-4" />
                Download report
              </button>
            </div>

            {attentionChecks.length > 0 && (
              <div className="mt-5 rounded-xl border border-current/15 bg-white/60 p-4">
                <h3 className="font-semibold">Prioritised next actions</h3>
                <div className="mt-3 space-y-3">
                  {attentionChecks.map((check, index) => (
                    <div
                      key={check.key}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white font-bold shadow-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{check.name}</p>
                        <p className="mt-0.5 flex items-start gap-1.5 opacity-90">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {nextActions[check.key] ||
                            "Investigate this check before the pilot."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {data?.build && (
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Running release
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {data.build.commitRef} @ {data.build.commitSha.slice(0, 7)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium capitalize">
                  {data.build.environment}
                </span>
                <span className="text-muted-foreground">Deployment</span>
                <span
                  className="max-w-48 truncate font-mono text-xs"
                  title={data.build.deploymentId}
                >
                  {data.build.deploymentId}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5" />
                Live end-to-end checks
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These checks use the signed-in account and current production
                data. They never create test leads or send messages.
              </p>
            </div>
            {data?.checkedAt && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(data.checkedAt).toLocaleString("en-AU")}
              </span>
            )}
          </div>

          <div className="divide-y">
            {loading && !data ? (
              <div className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Running production diagnostics…
              </div>
            ) : (
              data?.checks.map((check) => (
                <div
                  key={check.key}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-full border p-2 ${statusStyles[check.status]}`}
                    >
                      <StatusIcon status={check.status} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{check.name}</p>
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {check.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-11 sm:pl-0">
                    {typeof check.latencyMs === "number" && (
                      <span className="text-xs text-muted-foreground">
                        {check.latencyMs} ms
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[check.status]}`}
                    >
                      {check.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
          <h2 className="font-semibold">How to use this page</h2>
          <p className="mt-2 text-sm leading-6">
            Open this page after every deployment. Resolve red failures first,
            then investigate amber warnings before inviting pilot agencies.
            Checks are read-only, and no credentials or secret values are
            displayed.
          </p>
        </div>
      </div>
    </div>
  );
}
