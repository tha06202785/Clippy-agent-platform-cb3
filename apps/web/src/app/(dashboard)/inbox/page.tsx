"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bot, Inbox, Mail, MessageCircle, Search } from "lucide-react";

type Related<T> = T | T[] | null;
type Person = { id: string; full_name: string | null; email: string | null; phone: string | null; priority?: string | null; stage?: string | null };
type Listing = { id: string; address: string | null; status?: string | null };
type Message = { id: string; direction_in_out: string; text: string | null; created_at: string; read_at: string | null };
type Thread = {
  id: string; lead_id: string | null; listing_id: string | null; enquiry_id: string | null;
  channel: string; last_message_at: string | null; updated_at: string;
  leads: Related<Person>; listings: Related<Listing>; unread_count: number; message_count: number;
  latest_message: Message | null;
};

const one = <T,>(value: Related<T>): T | null => Array.isArray(value) ? value[0] || null : value;
const channelLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortTime = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "";

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load conversations");
      const data = await response.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load conversations");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  const selectThread = useCallback(async (id: string) => {
    setSelectedId(id); setLoadingMessages(true); setError("");
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load message history");
      const data = await response.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setThreads((current) => current.map((item) => item.id === id ? { ...item, unread_count: 0 } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load message history");
    } finally { setLoadingMessages(false); }
  }, []);

  const selected = threads.find((item) => item.id === selectedId) || null;
  const channels = useMemo(() => Array.from(new Set(threads.map((item) => item.channel))).sort(), [threads]);
  const filtered = useMemo(() => threads.filter((thread) => {
    const lead = one(thread.leads); const listing = one(thread.listings);
    const haystack = `${lead?.full_name || ""} ${lead?.email || ""} ${lead?.phone || ""} ${listing?.address || ""} ${thread.latest_message?.text || ""}`.toLowerCase();
    return (channel === "all" || thread.channel === channel) && haystack.includes(search.toLowerCase());
  }), [channel, search, threads]);

  const lead = selected ? one(selected.leads) : null;
  const listing = selected ? one(selected.listings) : null;
  const copilotParams = new URLSearchParams();
  if (selected?.lead_id) copilotParams.set("lead_id", selected.lead_id);
  if (selected?.listing_id) copilotParams.set("listing_id", selected.listing_id);
  if (selected?.enquiry_id) copilotParams.set("enquiry_id", selected.enquiry_id);
  if (selected?.id) copilotParams.set("conversation_id", selected.id);

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 overflow-hidden bg-background md:-m-6 lg:-m-8">
      <aside className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border bg-card md:w-[390px] md:flex-shrink-0`}>
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between"><div><h1 className="font-semibold">Conversations</h1><p className="text-xs text-muted-foreground">{threads.reduce((sum, item) => sum + item.unread_count, 0)} unread</p></div><Inbox className="h-5 w-5 text-primary" /></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, property, messages…" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary" /></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button onClick={() => setChannel("all")} className={`rounded-full px-3 py-1 text-xs ${channel === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>All</button>{channels.map((item) => <button key={item} onClick={() => setChannel(item)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${channel === item ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{channelLabel(item)}</button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading conversations…</div> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No conversations match this view.</div> : filtered.map((thread) => {
            const person = one(thread.leads); const property = one(thread.listings);
            return <button key={thread.id} onClick={() => void selectThread(thread.id)} className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/60 ${selectedId === thread.id ? "bg-muted" : ""}`}>
              <div className="flex items-start gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{(person?.full_name || "?")[0].toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{person?.full_name || person?.email || "Unknown client"}</span><span className="whitespace-nowrap text-[10px] text-muted-foreground">{shortTime(thread.latest_message?.created_at || thread.last_message_at)}</span></div><p className="truncate text-xs text-muted-foreground">{property?.address || channelLabel(thread.channel)}</p><div className="mt-1 flex items-center gap-2"><p className={`flex-1 truncate text-xs ${thread.unread_count ? "font-medium text-foreground" : "text-muted-foreground"}`}>{thread.latest_message?.direction_in_out === "out" ? "You: " : ""}{thread.latest_message?.text || "No messages yet"}</p>{thread.unread_count > 0 && <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">{thread.unread_count}</span>}</div></div></div>
            </button>;
          })}
        </div>
      </aside>

      <main className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!selected ? <div className="flex h-full flex-col items-center justify-center p-8 text-center"><MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" /><h2 className="font-semibold">Select a conversation</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">View the complete client and property message history in one place.</p></div> : <>
          <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3"><button onClick={() => { setSelectedId(null); setMessages([]); }} className="rounded-md p-2 hover:bg-muted md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{lead?.full_name || lead?.email || "Unknown client"}</h2><p className="truncate text-xs text-muted-foreground">{channelLabel(selected.channel)}{listing?.address ? ` · ${listing.address}` : ""}</p></div><Link href={`/copilot?${copilotParams.toString()}`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"><Bot className="h-4 w-4" /><span className="hidden sm:inline">Open Clippy</span></Link></header>
          <section className="flex-1 overflow-y-auto p-4 md:p-6">{loadingMessages ? <div className="text-center text-sm text-muted-foreground">Loading message history…</div> : messages.length === 0 ? <div className="text-center text-sm text-muted-foreground">No messages in this conversation yet.</div> : <div className="mx-auto flex max-w-3xl flex-col gap-3">{messages.map((message) => <div key={message.id} className={`flex ${message.direction_in_out === "out" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${message.direction_in_out === "out" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card"}`}><p className="whitespace-pre-wrap break-words">{message.text || "(No text content)"}</p><p className={`mt-1 text-[10px] ${message.direction_in_out === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{shortTime(message.created_at)}</p></div></div>)}</div>}</section>
          <footer className="border-t border-border bg-card p-4"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3"><div className="min-w-0"><p className="text-sm font-medium">Draft safely with Clippy</p><p className="truncate text-xs text-muted-foreground">Sending stays approval-only while channel connections are repaired.</p></div><div className="flex gap-2">{lead?.email && <a href={`mailto:${lead.email}`} className="rounded-md border border-border bg-background p-2" aria-label="Open email"><Mail className="h-4 w-4" /></a>}<Link href={`/copilot?${copilotParams.toString()}`} className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Draft reply</Link></div></div></footer>
        </>}
        {error && <div className="absolute bottom-4 right-4 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">{error}</div>}
      </main>
    </div>
  );
}
