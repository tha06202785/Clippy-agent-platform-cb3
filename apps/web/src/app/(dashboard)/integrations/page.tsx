"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Calendar, CheckCircle2, Clock, Globe, Instagram, Loader2, Mail, MessageCircle, RefreshCw, Shield, XCircle } from "lucide-react";

type Status = "healthy" | "warning" | "error" | "not_connected";

type IntegrationStatus = {
  id?: string;
  provider: string;
  status?: string;
  email?: string;
  last_sync_at?: string;
  items_indexed?: number;
  humanMessage?: string;
  canAutoRefresh?: boolean;
  permissions?: { granted: number; required: number; missing?: string[] };
};

type Integration = {
  provider: string;
  name: string;
  description: string;
  status: Status;
  connected: boolean;
  email?: string;
  lastSync?: string;
  itemsIndexed: number;
  humanMessage?: string;
  canAutoRefresh?: boolean;
  permissions?: { granted: number; required: number; missing?: string[] };
};

const CONFIG = {
  gmail: { name: "Gmail", description: "Read and send lead emails", icon: Mail, connectUrl: "/api/integrations/google" },
  "google-calendar": { name: "Google Calendar", description: "Book inspections and meetings", icon: Calendar, connectUrl: "/api/integrations/google" },
  facebook: { name: "Facebook", description: "Capture Messenger and Lead Ads enquiries", icon: Globe, connectUrl: "/api/integrations/facebook" },
  instagram: { name: "Instagram", description: "Capture business-account direct messages", icon: Instagram, connectUrl: "/api/integrations/facebook" },
  whatsapp: { name: "WhatsApp", description: "Message and follow up with leads", icon: MessageCircle, connectUrl: "/api/integrations/whatsapp" },
} as const;

function normaliseStatus(value?: string): Status {
  if (value === "healthy" || value === "connected") return "healthy";
  if (value === "warning") return "warning";
  if (value === "error" || value === "expired") return "error";
  return "not_connected";
}

function relativeTime(value?: string) {
  if (!value) return "Never";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => []);
      if (!response.ok) throw new Error(payload?.error || "Unable to load integrations");
      const statuses: IntegrationStatus[] = Array.isArray(payload) ? payload : Array.isArray(payload?.integrations) ? payload.integrations : [];
      const mapped = Object.entries(CONFIG).map(([provider, config]) => {
        const existing = statuses.find((item) => item.provider === provider);
        const status = normaliseStatus(existing?.status);
        return {
          provider,
          name: config.name,
          description: config.description,
          status,
          connected: status !== "not_connected",
          email: existing?.email,
          lastSync: existing?.last_sync_at,
          itemsIndexed: existing?.items_indexed ?? 0,
          humanMessage: existing?.humanMessage,
          canAutoRefresh: existing?.canAutoRefresh,
          permissions: existing?.permissions,
        } satisfies Integration;
      });
      setIntegrations(mapped);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load integrations");
      setIntegrations(Object.entries(CONFIG).map(([provider, config]) => ({ provider, name: config.name, description: config.description, status: "not_connected", connected: false, itemsIndexed: 0 })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const testConnection = async (provider: string) => {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch(`/api/integrations/test/${encodeURIComponent(provider)}`, { cache: "no-store", credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.humanMessage || "Connection test failed");
      setIntegrations((current) => current.map((item) => item.provider === provider ? { ...item, status: result.success ? "healthy" : "error", connected: true, humanMessage: result.humanMessage, lastSync: result.last_sync_at ?? item.lastSync, itemsIndexed: result.items_indexed ?? item.itemsIndexed, canAutoRefresh: result.canAutoRefresh ?? item.canAutoRefresh, permissions: result.permissions ?? item.permissions } : item));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Connection test failed";
      setIntegrations((current) => current.map((item) => item.provider === provider ? { ...item, status: "error", connected: true, humanMessage: message } : item));
    } finally {
      setBusy(null);
    }
  };

  const connect = (provider: keyof typeof CONFIG) => { window.location.assign(CONFIG[provider].connectUrl); };

  const healthy = integrations.filter((item) => item.status === "healthy").length;
  const connected = integrations.filter((item) => item.connected).length;
  const indexed = integrations.reduce((sum, item) => sum + item.itemsIndexed, 0);
  const latestSync = useMemo(() => integrations.map((item) => item.lastSync).filter(Boolean).sort().at(-1), [integrations]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <main className="space-y-6 bg-neutral-50 p-4 pb-28 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-neutral-900">Integrations</h1><p className="text-sm text-neutral-600">Connect channels, test their health and see what Clippy has indexed.</p></div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" />Refresh status</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4"><Activity className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold">{healthy}/{connected}</p><p className="text-xs text-neutral-500">Healthy connections</p></div>
        <div className="rounded-xl border bg-white p-4"><Shield className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-bold">{indexed.toLocaleString("en-AU")}</p><p className="text-xs text-neutral-500">Items indexed</p></div>
        <div className="rounded-xl border bg-white p-4"><Clock className="h-5 w-5 text-amber-600" /><p className="mt-3 text-lg font-bold">{relativeTime(latestSync)}</p><p className="text-xs text-neutral-500">Latest sync</p></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const config = CONFIG[integration.provider as keyof typeof CONFIG];
          const Icon = config.icon;
          const StatusIcon = integration.status === "healthy" ? CheckCircle2 : integration.status === "error" ? XCircle : AlertCircle;
          const statusClass = integration.status === "healthy" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : integration.status === "error" ? "border-red-200 bg-red-50 text-red-700" : integration.status === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-neutral-200 bg-neutral-50 text-neutral-600";
          return (
            <article key={integration.provider} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="rounded-xl bg-emerald-50 p-3"><Icon className="h-6 w-6 text-emerald-700" /></div><div><h2 className="font-semibold text-neutral-900">{integration.name}</h2><p className="text-sm text-neutral-500">{integration.description}</p></div></div><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}><StatusIcon className="h-3 w-3" />{integration.status === "not_connected" ? "Not connected" : integration.status}</span></div>
              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                {integration.email && <p>{integration.email}</p>}
                <p>{integration.itemsIndexed.toLocaleString("en-AU")} items indexed · Last sync {relativeTime(integration.lastSync)}</p>
                {integration.permissions && <p>{integration.permissions.granted}/{integration.permissions.required} permissions granted</p>}
                {integration.humanMessage && <div className={`rounded-lg border p-3 ${statusClass}`}>{integration.humanMessage}</div>}
              </div>
              <div className="mt-5 flex gap-2">
                {integration.connected && <button disabled={busy === integration.provider} onClick={() => void testConnection(integration.provider)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">{busy === integration.provider ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Test connection</button>}
                <button onClick={() => connect(integration.provider as keyof typeof CONFIG)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{integration.connected ? "Reconnect" : "Connect"}</button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
