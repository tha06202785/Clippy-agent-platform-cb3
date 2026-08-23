"use client";

import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  EyeOff,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  ConversationMessageCard,
  type ConversationMessage as Message,
} from "@/components/conversation-message";

type Related<T> = T | T[] | null;
type Person = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  priority?: string | null;
  stage?: string | null;
};
type Listing = { id: string; address: string | null; status?: string | null };
type Thread = {
  id: string;
  lead_id: string | null;
  listing_id: string | null;
  enquiry_id: string | null;
  channel: string;
  last_message_at: string | null;
  updated_at: string;
  leads: Related<Person>;
  listings: Related<Listing>;
  unread_count: number;
  message_count: number;
  hidden_count?: number;
  latest_message: Message | null;
};

const one = <T,>(value: Related<T>): T | null =>
  Array.isArray(value) ? value[0] || null : value;
const channelLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "";
export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [automationApprovalId, setAutomationApprovalId] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState("");
  const [instruction, setInstruction] = useState("");
  const [approved, setApproved] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [notice, setNotice] = useState("");
  const draftPreviewRef = useRef<HTMLTextAreaElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations${showHidden ? "?view=hidden" : ""}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not load conversations");
      const data = await response.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load conversations",
      );
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!draft) return;
    const frame = window.requestAnimationFrame(() => {
      draftPreviewRef.current?.focus();
      draftPreviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [draft]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/conversations/${selectedId}/messages${showHidden ? "?view=hidden" : ""}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.messages)) setMessages(data.messages);
      } catch {
        // Keep the existing history visible when a background refresh fails.
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [selectedId, showHidden]);

  const selectThread = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setLoadingMessages(true);
      setError("");
      setDraft("");
      setDraftId(null);
      setAutomationApprovalId(null);
      setApproved(false);
      setInstruction("");
      try {
        const response = await fetch(
          `/api/conversations/${id}/messages${showHidden ? "?view=hidden" : ""}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Could not load message history");
        const data = await response.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setThreads((current) =>
          current.map((item) =>
            item.id === id ? { ...item, unread_count: 0 } : item,
          ),
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load message history",
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [showHidden],
  );

  const selected = threads.find((item) => item.id === selectedId) || null;

  const createDraft = useCallback(async () => {
    if (!selectedId) return;
    setDrafting(true);
    setError("");
    setApproved(false);
    try {
      const response = await fetch("/api/ai/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedId,
          instruction: instruction || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Clippy could not create a draft");
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!reply) throw new Error("Clippy returned an empty draft. Try again.");
      setDraft(reply);
      setDraftId(data.draft_id || null);
      setAutomationApprovalId(data.approval_id || null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Clippy could not create a draft",
      );
    } finally {
      setDrafting(false);
    }
  }, [instruction, selectedId]);

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createDraft();
  };

  const approveDraft = useCallback(async () => {
    if (!selected || !draftId || !draft.trim()) return;
    setApproving(true);
    setError("");
    const actionChannel =
      selected.channel === "email" ||
      selected.channel === "sms" ||
      selected.channel === "whatsapp"
        ? selected.channel
        : selected.channel === "facebook" ||
            selected.channel === "facebook_messenger"
          ? "facebook"
          : "copy";
    try {
      const response = await fetch(
        automationApprovalId
          ? `/api/automation/approvals/${automationApprovalId}`
          : "/api/copilot/actions/approve",
        {
          method: automationApprovalId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: automationApprovalId
            ? JSON.stringify({ decision: "approve", content: draft })
            : JSON.stringify({
                draft_id: draftId,
                channel: actionChannel,
                content: draft,
                lead_id: selected.lead_id || undefined,
                conversation_id: selected.id,
              }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The draft could not be approved");
      setApproved(true);
      if (actionChannel === "copy") {
        await navigator.clipboard.writeText(draft);
      } else if (
        (actionChannel === "email" ||
          actionChannel === "facebook" ||
          actionChannel === "whatsapp") &&
        data.sent &&
        data.message
      ) {
        setMessages((current) => [...current, data.message]);
        setThreads((current) =>
          current.map((thread) =>
            thread.id === selected.id
              ? {
                  ...thread,
                  latest_message: data.message,
                  last_message_at: data.message.created_at,
                  message_count: thread.message_count + 1,
                }
              : thread,
          ),
        );
        setDraft("");
        setDraftId(null);
        setAutomationApprovalId(null);
      } else if (actionChannel === "sms" && data.recipient?.phone) {
        window.location.href = `sms:${data.recipient.phone}?body=${encodeURIComponent(draft)}`;
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The draft could not be approved",
      );
    } finally {
      setApproving(false);
    }
  }, [automationApprovalId, draft, draftId, selected]);

  const channels = useMemo(
    () => Array.from(new Set(threads.map((item) => item.channel))).sort(),
    [threads],
  );
  const filtered = useMemo(
    () =>
      threads.filter((thread) => {
        const lead = one(thread.leads);
        const listing = one(thread.listings);
        const haystack =
          `${lead?.full_name || ""} ${lead?.email || ""} ${lead?.phone || ""} ${listing?.address || ""} ${thread.latest_message?.text || ""}`.toLowerCase();
        return (
          (channel === "all" || thread.channel === channel) &&
          haystack.includes(search.toLowerCase())
        );
      }),
    [channel, search, threads],
  );

  const lead = selected ? one(selected.leads) : null;
  const listing = selected ? one(selected.listings) : null;
  const copilotParams = new URLSearchParams();
  if (selected?.lead_id) copilotParams.set("lead_id", selected.lead_id);
  if (selected?.listing_id)
    copilotParams.set("listing_id", selected.listing_id);
  if (selected?.enquiry_id)
    copilotParams.set("enquiry_id", selected.enquiry_id);
  if (selected?.id) copilotParams.set("conversation_id", selected.id);

  return (
    <div className="-m-4 flex h-[calc(100dvh-8.5rem)] overflow-hidden bg-background sm:-m-6 sm:h-[calc(100dvh-8rem)]">
      <aside
        aria-label="Conversation list"
        className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border bg-card md:w-[390px] md:flex-shrink-0`}
      >
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="font-semibold">
                {showHidden ? "Hidden conversations" : "Conversations"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {showHidden
                  ? `${threads.reduce((sum, item) => sum + item.message_count, 0)} hidden messages`
                  : `${threads.reduce((sum, item) => sum + item.unread_count, 0)} unread`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowHidden((current) => !current);
                setSelectedId(null);
                setMessages([]);
                setChannel("all");
                setLoading(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium hover:bg-muted"
              aria-label={
                showHidden
                  ? "Return to visible conversations"
                  : "Review hidden conversations"
              }
            >
              {showHidden ? (
                <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              {showHidden ? "Inbox" : "Hidden"}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, property, messages…"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setChannel("all")}
              aria-pressed={channel === "all"}
              className={`rounded-full px-3 py-1 text-xs ${channel === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              All
            </button>
            {channels.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setChannel(item)}
                aria-pressed={channel === item}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${channel === item ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {channelLabel(item)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading conversations…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {showHidden
                ? "No hidden conversations."
                : "No conversations match this view."}
            </div>
          ) : (
            filtered.map((thread) => {
              const person = one(thread.leads);
              const property = one(thread.listings);
              return (
                <button
                  type="button"
                  key={thread.id}
                  onClick={() => void selectThread(thread.id)}
                  aria-current={selectedId === thread.id ? "true" : undefined}
                  className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/60 ${selectedId === thread.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(person?.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {person?.full_name ||
                            person?.email ||
                            "Unknown client"}
                        </span>
                        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                          {shortTime(
                            thread.latest_message?.created_at ||
                              thread.last_message_at,
                          )}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {property?.address || channelLabel(thread.channel)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p
                          className={`flex-1 truncate text-xs ${thread.unread_count ? "font-medium text-foreground" : "text-muted-foreground"}`}
                        >
                          {thread.latest_message?.direction_in_out === "out"
                            ? "You: "
                            : ""}
                          {thread.latest_message?.text || "No messages yet"}
                        </p>
                        {thread.unread_count > 0 && (
                          <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        aria-label="Selected conversation"
        className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}
      >
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <MessageCircle
              className="mb-4 h-12 w-12 text-muted-foreground/40"
              aria-hidden="true"
            />
            <h2 className="font-semibold">Select a conversation</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              View the complete client and property message history in one
              place.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setMessages([]);
                }}
                className="rounded-md p-2 hover:bg-muted md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">
                  {lead?.full_name || lead?.email || "Unknown client"}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {channelLabel(selected.channel)}
                  {listing?.address ? ` · ${listing.address}` : ""}
                </p>
              </div>
              {showHidden ? (
                <span className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                  Hidden from AI
                </span>
              ) : (
                <Link
                  href={`/copilot?${copilotParams.toString()}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Open Clippy</span>
                </Link>
              )}
            </header>
            <section className="flex-1 overflow-y-auto p-4 md:p-6">
              {loadingMessages ? (
                <div
                  className="text-center text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  Loading message history…
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground">
                  {showHidden
                    ? "No hidden messages remain in this conversation."
                    : "No messages in this conversation yet."}
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {messages.map((message) => (
                    <ConversationMessageCard
                      key={message.id}
                      conversationId={selected.id}
                      conversationChannel={selected.channel}
                      message={message}
                      onChanged={(updated) =>
                        setMessages((current) =>
                          current.map((item) =>
                            item.id === updated.id ? updated : item,
                          ),
                        )
                      }
                      onRemoved={(messageId) => {
                        setMessages((current) =>
                          current.filter((item) => item.id !== messageId),
                        );
                        void loadThreads();
                      }}
                      onError={setError}
                      onNotice={setNotice}
                    />
                  ))}
                </div>
              )}
            </section>
            {showHidden ? (
              <footer className="border-t border-border bg-card p-4 pb-24 text-center text-xs text-muted-foreground md:pb-4">
                Restore a message before using it in Clippy drafts or Copilot.
              </footer>
            ) : (
              <footer className="max-h-[55vh] overflow-y-auto border-t border-border bg-card p-4 pb-24 md:max-h-none md:pb-4">
                <div className="mx-auto max-w-3xl rounded-lg border border-border bg-muted/40 p-3">
                  {draft ? (
                    <div
                      className="space-y-3"
                      role="region"
                      aria-label="Clippy draft preview"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <Bot
                              className="h-4 w-4 text-primary"
                              aria-hidden="true"
                            />
                            Clippy draft
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Review and edit before approval.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft("");
                            setDraftId(null);
                            setAutomationApprovalId(null);
                            setApproved(false);
                          }}
                          className="rounded-md p-2 hover:bg-muted"
                          aria-label="Close draft"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <textarea
                        ref={draftPreviewRef}
                        data-testid="clippy-draft-preview"
                        aria-label="Edit Clippy reply"
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value);
                          setApproved(false);
                        }}
                        rows={5}
                        className="w-full resize-y rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Connected Email, Facebook and WhatsApp send only after
                          approval. SMS opens your messaging app.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void navigator.clipboard.writeText(draft)
                            }
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            Copy
                          </button>
                          <button
                            type="button"
                            disabled={approving || !draft.trim()}
                            onClick={() => void approveDraft()}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                          >
                            {approving ? (
                              <Loader2
                                className="h-3.5 w-3.5 motion-safe:animate-spin"
                                aria-hidden="true"
                              />
                            ) : approved ? (
                              <Check
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <Send
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {approved
                              ? "Approved"
                              : selected.channel === "email"
                                ? "Approve & send email"
                                : selected.channel === "sms"
                                  ? "Approve & open SMS"
                                  : selected.channel === "whatsapp" ||
                                      selected.channel === "facebook" ||
                                      selected.channel === "facebook_messenger"
                                    ? "Approve & send"
                                    : "Approve & copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Draft safely with Clippy
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Uses this client, property and message history.
                          </p>
                        </div>
                        {lead?.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="rounded-md border border-border bg-background p-2"
                            aria-label="Open email"
                          >
                            <Mail className="h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                      <form
                        className="flex gap-2"
                        aria-label="Create Clippy draft"
                        onSubmit={submitDraft}
                      >
                        <input
                          aria-label="Draft instruction"
                          value={instruction}
                          onChange={(event) =>
                            setInstruction(event.target.value)
                          }
                          placeholder="Optional instruction, e.g. offer Tuesday at 4pm"
                          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="submit"
                          disabled={drafting}
                          aria-busy={drafting}
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {drafting ? (
                            <Loader2
                              className="h-3.5 w-3.5 motion-safe:animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {drafting ? "Drafting…" : "Create draft"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </footer>
            )}
          </>
        )}
        {error && (
          <div
            className="absolute bottom-4 right-4 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg"
            role="alert"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            className="absolute bottom-4 left-1/2 z-40 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white shadow-lg"
            role="status"
          >
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-3 rounded p-0.5 hover:bg-white/15"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
