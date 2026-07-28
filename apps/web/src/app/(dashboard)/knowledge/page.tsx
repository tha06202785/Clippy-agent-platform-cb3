"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Building2, CheckCircle, Clock, Loader2, Plus, Search, User, Users, X } from "lucide-react";

type Layer = "real_estate_shared" | "agency_private" | "agent_private" | "client_memory";
type KnowledgeDocument = { id: string; title: string; content: string; layer: Layer; status?: string; created_at?: string };
type Integration = { id?: string; provider: string; status?: string; items_indexed?: number; last_sync_at?: string };
type AgentProfile = { communication_tone?: string; confidence_score?: number; corrections_made?: number; status?: string };

const layers: Record<Layer, { name: string; description: string; icon: typeof Brain; className: string }> = {
  real_estate_shared: { name: "Real Estate Knowledge", description: "Shared compliance and industry guidance", icon: Brain, className: "bg-blue-500" },
  agency_private: { name: "Agency Brain", description: "Policies, scripts and brand standards", icon: Building2, className: "bg-purple-500" },
  agent_private: { name: "Agent Profile", description: "Your tone, preferences and working style", icon: User, className: "bg-emerald-500" },
  client_memory: { name: "Client Memory", description: "Lead preferences and conversation context", icon: Users, className: "bg-amber-500" },
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload as T;
}

export default function KnowledgeDashboard() {
  const [knowledge, setKnowledge] = useState<KnowledgeDocument[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", layer: "agency_private" as Layer });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [documents, status, agent] = await Promise.all([
        jsonRequest<KnowledgeDocument[]>("/api/knowledge?limit=100"),
        jsonRequest<Integration[] | { integrations: Integration[] }>("/api/integrations/status").catch(() => []),
        jsonRequest<AgentProfile>("/api/agent-profile").catch(() => ({})),
      ]);
      setKnowledge(Array.isArray(documents) ? documents : []);
      setIntegrations(Array.isArray(status) ? status : status.integrations ?? []);
      setProfile(agent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); return; }
    setSearching(true);
    setError(null);
    try {
      const result = await jsonRequest<{ results?: KnowledgeDocument[] }>("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, top_k: 10 }) });
      setSearchResults(result.results ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const addKnowledge = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await jsonRequest<KnowledgeDocument>("/api/knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title.trim(), content: form.content.trim(), layer: form.layer, source: "manual", source_metadata: { added_from: "knowledge_dashboard" } }) });
      setForm({ title: "", content: "", layer: "agency_private" });
      setShowAdd(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add knowledge");
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(() => knowledge.reduce<Record<string, number>>((acc, document) => { acc[document.layer] = (acc[document.layer] ?? 0) + 1; return acc; }, {}), [knowledge]);
  const indexed = knowledge.filter((document) => document.status === "indexed").length;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <main className="space-y-6 bg-neutral-50 p-4 pb-28 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-neutral-900">Knowledge</h1><p className="text-sm text-neutral-600">Teach Clippy your agency policies, scripts, services and communication style.</p></div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add knowledge</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSearch} className="flex gap-2 rounded-xl border bg-white p-2 shadow-sm">
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ask what Clippy knows…" className="min-w-0 flex-1 rounded-lg px-3 py-2 outline-none" />
        <button disabled={searching} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</button>
      </form>

      {searchQuery.trim() && !searching && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold text-neutral-900">Search results</h2>{searchResults.length ? <div className="mt-3 space-y-3">{searchResults.map((document) => <article key={document.id} className="rounded-lg bg-neutral-50 p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium text-neutral-900">{document.title}</h3><p className="mt-1 line-clamp-3 text-sm text-neutral-600">{document.content}</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{layers[document.layer]?.name ?? document.layer}</span></div></article>)}</div> : <p className="mt-3 text-sm text-neutral-500">No matching knowledge found.</p>}</section>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(layers) as [Layer, (typeof layers)[Layer]][]).map(([key, layer]) => { const Icon = layer.icon; const count = counts[key] ?? 0; return <article key={key} className="rounded-xl border bg-white p-4 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${layer.className}`}><Icon className="h-5 w-5 text-white" /></div><h2 className="mt-3 font-semibold text-neutral-900">{layer.name}</h2><p className="mt-1 text-xs text-neutral-500">{layer.description}</p><p className="mt-3 text-2xl font-bold">{count}</p><p className="text-xs text-neutral-500">knowledge items</p></article>; })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border bg-white p-5 lg:col-span-2"><div className="flex items-center justify-between"><h2 className="font-semibold text-neutral-900">Recent knowledge</h2><span className="text-xs text-neutral-500">{indexed}/{knowledge.length} indexed</span></div><div className="mt-4 space-y-3">{knowledge.slice(0, 8).map((document) => <div key={document.id} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 p-3"><div><p className="font-medium text-neutral-900">{document.title}</p><p className="mt-1 line-clamp-2 text-sm text-neutral-600">{document.content}</p></div><span className="shrink-0 text-xs text-neutral-500">{document.status ?? "pending"}</span></div>)}{knowledge.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center"><Brain className="mx-auto h-8 w-8 text-neutral-400" /><p className="mt-3 font-medium">Clippy has no agency knowledge yet</p><p className="mt-1 text-sm text-neutral-500">Add office hours, service areas, FAQs, scripts or policies.</p></div>}</div></article>

        <article className="space-y-4 rounded-xl border bg-white p-5"><h2 className="font-semibold text-neutral-900">AI readiness</h2><div className="rounded-lg bg-emerald-50 p-4"><p className="text-3xl font-bold text-emerald-700">{knowledge.length ? Math.min(100, 30 + indexed * 5) : 20}%</p><p className="text-sm text-emerald-800">Knowledge readiness</p></div><div className="space-y-2 text-sm text-neutral-600"><p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" />{knowledge.length} documents available</p><p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-600" />{integrations.filter((item) => item.status === "healthy" || item.status === "connected").length} healthy integrations</p><p className="flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" />Tone: {profile?.communication_tone || "not configured"}</p><p className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" />{profile?.corrections_made ?? 0} Teach Clippy corrections</p></div></article>
      </section>

      {showAdd && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4"><form onSubmit={addKnowledge} className="w-full rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-xl sm:rounded-2xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add knowledge</h2><p className="text-sm text-neutral-500">This information becomes available to Clippy.</p></div><button type="button" onClick={() => setShowAdd(false)} className="rounded-lg p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium">Title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Example: Office opening hours" required /></label><label className="block text-sm font-medium">Knowledge layer<select value={form.layer} onChange={(event) => setForm((current) => ({ ...current, layer: event.target.value as Layer }))} className="mt-1 w-full rounded-lg border px-3 py-2">{Object.entries(layers).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label><label className="block text-sm font-medium">Information<textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={7} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Our office is open Monday to Friday…" required /></label></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => setShowAdd(false)} className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save to Clippy</button></div></form></div>}
    </main>
  );
}
