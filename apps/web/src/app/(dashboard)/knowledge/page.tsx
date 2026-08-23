"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Brain,
  Building2,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  User,
  Users,
} from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  LoadingState,
  Select,
  Textarea,
} from "@clippy/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Layer =
  "real_estate_shared" | "agency_private" | "agent_private" | "client_memory";

type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  layer: Layer;
  status?: string;
  created_at?: string;
};

type Integration = {
  provider: string;
  status?: string;
  items_indexed?: number;
  last_sync_at?: string;
};

type AgentProfile = {
  communication_tone?: string;
  confidence_score?: number;
  corrections_made?: number;
  status?: string;
};

type GoogleSyncResult = {
  gmail?: { indexed?: number; unchanged?: number; total?: number };
  calendar?: { indexed?: number; unchanged?: number; total?: number };
};

const layers: Record<
  Layer,
  {
    name: string;
    description: string;
    icon: typeof Brain;
    className: string;
  }
> = {
  real_estate_shared: {
    name: "Real Estate Knowledge",
    description: "Shared compliance and industry guidance",
    icon: Brain,
    className: "bg-blue-500",
  },
  agency_private: {
    name: "Agency Brain",
    description: "Policies, scripts and brand standards",
    icon: Building2,
    className: "bg-purple-500",
  },
  agent_private: {
    name: "Agent Profile",
    description: "Your tone, preferences and working style",
    icon: User,
    className: "bg-emerald-500",
  },
  client_memory: {
    name: "Client Memory",
    description: "Lead preferences and conversation context",
    icon: Users,
    className: "bg-amber-500",
  },
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
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
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    layer: "agency_private" as Layer,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const [documents, status, agent] = await Promise.all([
        jsonRequest<KnowledgeDocument[]>("/api/knowledge?limit=100"),
        jsonRequest<Integration[] | { integrations: Integration[] }>(
          "/api/integrations/status",
        ).catch(() => []),
        jsonRequest<AgentProfile>("/api/agent-profile").catch(() => ({})),
      ]);
      setKnowledge(Array.isArray(documents) ? documents : []);
      setIntegrations(
        Array.isArray(status) ? status : (status.integrations ?? []),
      );
      setProfile(agent);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load knowledge base",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refreshWhenActive = () => void load();
    window.addEventListener("focus", refreshWhenActive);
    return () => window.removeEventListener("focus", refreshWhenActive);
  }, [load]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const result = await jsonRequest<{ results?: KnowledgeDocument[] }>(
        "/api/knowledge/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, top_k: 10 }),
        },
      );
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
      await jsonRequest<KnowledgeDocument>("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          layer: form.layer,
          source: "manual",
          source_metadata: { added_from: "knowledge_dashboard" },
        }),
      });
      setForm({ title: "", content: "", layer: "agency_private" });
      setShowAdd(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add knowledge",
      );
    } finally {
      setSaving(false);
    }
  };

  const syncGoogleKnowledge = async () => {
    setSyncing(true);
    setError(null);
    setSyncNotice(null);
    try {
      const result = await jsonRequest<GoogleSyncResult>(
        "/api/integrations/sync",
        { method: "POST" },
      );
      await load();
      const indexed =
        (result.gmail?.indexed ?? 0) + (result.calendar?.indexed ?? 0);
      const unchanged =
        (result.gmail?.unchanged ?? 0) + (result.calendar?.unchanged ?? 0);
      setSyncNotice(
        indexed > 0
          ? `Google sync complete. ${indexed} new knowledge ${indexed === 1 ? "item is" : "items are"} now available.`
          : `Google sync complete. No new items; ${unchanged} existing ${unchanged === 1 ? "item is" : "items are"} already current.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Google data could not be synchronised",
      );
    } finally {
      setSyncing(false);
    }
  };

  const counts = useMemo(
    () =>
      knowledge.reduce<Record<string, number>>((accumulator, document) => {
        accumulator[document.layer] = (accumulator[document.layer] ?? 0) + 1;
        return accumulator;
      }, {}),
    [knowledge],
  );
  const indexed = knowledge.filter(
    (document) => document.status === "indexed",
  ).length;
  const googleConnected = integrations.some(
    (integration) =>
      integration.provider === "gmail" &&
      (integration.status === "healthy" ||
        integration.status === "connected"),
  );
  const lastGoogleSync = integrations
    .filter((integration) =>
      ["gmail", "google-calendar"].includes(integration.provider),
    )
    .map((integration) => integration.last_sync_at)
    .filter((value): value is string => Boolean(value))
    .toSorted()
    .at(-1);

  if (loading) return <LoadingState label="Loading agency knowledge" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge</h2>
          <p className="text-sm text-muted-foreground">
            Teach Clippy your agency policies, scripts, services and
            communication style.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!googleConnected}
            isLoading={syncing}
            loadingText="Syncing Google…"
            onClick={() => void syncGoogleKnowledge()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sync Google
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add knowledge
              </Button>
            </DialogTrigger>
            <DialogContent>
            <form onSubmit={addKnowledge}>
              <DialogHeader>
                <DialogTitle>Add knowledge</DialogTitle>
                <DialogDescription>
                  This information becomes available to Clippy after it is saved
                  and indexed.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p
                  className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <div className="mt-5 space-y-4">
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="knowledge-title"
                  >
                    Title
                  </label>
                  <Input
                    id="knowledge-title"
                    className="mt-1"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Example: Office opening hours"
                    required
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="knowledge-layer"
                  >
                    Knowledge layer
                  </label>
                  <Select
                    id="knowledge-layer"
                    className="mt-1"
                    value={form.layer}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        layer: event.target.value as Layer,
                      }))
                    }
                  >
                    {Object.entries(layers).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium"
                    htmlFor="knowledge-information"
                  >
                    Information
                  </label>
                  <Textarea
                    id="knowledge-information"
                    className="mt-1"
                    value={form.content}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    rows={7}
                    placeholder="Our office is open Monday to Friday…"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" isLoading={saving} loadingText="Saving…">
                  Save to Clippy
                </Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {lastGoogleSync
            ? `Last Google sync ${new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(lastGoogleSync))}`
            : googleConnected
              ? "Google is connected and waiting for its first sync."
              : "Connect Google to import relevant Gmail and Calendar knowledge."}
        </p>
        {syncNotice ? (
          <p className="text-primary" role="status" aria-live="polite">
            {syncNotice}
          </p>
        ) : null}
      </div>

      {error && !showAdd ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSearch}
        role="search"
        className="flex gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        <label className="sr-only" htmlFor="knowledge-search">
          Search agency knowledge
        </label>
        <Input
          id="knowledge-search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Ask what Clippy knows…"
          className="min-w-0 flex-1 border-0 shadow-none"
        />
        <Button
          type="submit"
          variant="secondary"
          isLoading={searching}
          loadingText="Searching…"
        >
          <Search className="h-4 w-4" aria-hidden="true" /> Search
        </Button>
      </form>

      {searchQuery.trim() && !searching ? (
        <section
          className="rounded-xl border border-border bg-card p-4"
          aria-labelledby="knowledge-search-results"
        >
          <h2 id="knowledge-search-results" className="font-semibold">
            Search results
          </h2>
          {searchResults.length ? (
            <div className="mt-3 space-y-3">
              {searchResults.map((document) => (
                <article key={document.id} className="rounded-lg bg-muted p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{document.title}</h3>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        {document.content}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {layers[document.layer]?.name ?? document.layer}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Search}
              title="No matching knowledge"
              description="Try a broader phrase, or add the answer to the agency brain."
              className="mt-3"
            />
          )}
        </section>
      ) : null}

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Knowledge layers"
      >
        {(Object.entries(layers) as [Layer, (typeof layers)[Layer]][]).map(
          ([key, layer]) => {
            const Icon = layer.icon;
            const count = counts[key] ?? 0;
            return (
              <article
                key={key}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${layer.className}`}
                >
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h2 className="mt-3 font-semibold">{layer.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {layer.description}
                </p>
                <p className="mt-3 text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">knowledge items</p>
              </article>
            );
          },
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent knowledge</h2>
            <span className="text-xs text-muted-foreground">
              {indexed}/{knowledge.length} indexed
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {knowledge.slice(0, 8).map((document) => (
              <div
                key={document.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-muted p-3"
              >
                <div>
                  <p className="font-medium">{document.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {document.content}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {document.status ?? "pending"}
                </span>
              </div>
            ))}
            {knowledge.length === 0 ? (
              <EmptyState
                compact
                icon={Brain}
                title="Clippy has no agency knowledge yet"
                description="Add office hours, service areas, FAQs, scripts or policies."
              />
            ) : null}
          </div>
        </article>

        <article className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">AI readiness</h2>
          <div className="rounded-lg bg-primary/10 p-4">
            <p className="text-3xl font-bold text-primary">
              {knowledge.length ? Math.min(100, 30 + indexed * 5) : 20}%
            </p>
            <p className="text-sm">Knowledge readiness</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CheckCircle
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              {knowledge.length} documents available
            </p>
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              {
                integrations.filter(
                  (item) =>
                    item.status === "healthy" || item.status === "connected",
                ).length
              }{" "}
              healthy integrations
            </p>
            <p className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              Tone: {profile?.communication_tone || "forming from approved examples"}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              {profile?.corrections_made ?? 0} Teach Clippy corrections
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
