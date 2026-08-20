"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
  X,
} from "lucide-react";
import {
  resolveInitialCopilotContextItem,
  type CopilotContextItem,
  type CopilotContextSelection,
} from "@/lib/copilot-context";
import type {
  ProposedDraftAction,
  ProposedInspectionSlotAction,
} from "@/lib/copilot-actions";
import {
  DraftApprovalCard,
  InspectionSlotApprovalCard,
  type DraftActionState,
  type InspectionSlotActionState,
} from "@/components/copilot/action-cards";

const quickActions = [
  {
    label: "Create inspection slot",
    prompt: "Create an inspection slot this Saturday at 11:30 am",
  },
  { label: "Draft follow-up", prompt: "Draft a follow-up email" },
  {
    label: "Summarise context",
    prompt: "Summarise this context and the latest activity",
  },
  {
    label: "Suggest next step",
    prompt: "What is the best next action and why?",
  },
  {
    label: "Prepare call",
    prompt: "Prepare concise talking points for my next call",
  },
];

const thinkingSteps = [
  "Reading your message",
  "Validating selected context",
  "Checking your knowledge base",
  "Reviewing compliance requirements",
  "Drafting response",
  "Final review",
];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  contextLabel?: string;
  draftAction?: DraftActionState;
  slotAction?: InspectionSlotActionState;
};

const contextGroups = [
  {
    kind: "conversation" as const,
    label: "Conversations",
    description: "Exact client, property and channel",
    icon: MessageCircle,
  },
  {
    kind: "enquiry" as const,
    label: "Property enquiries",
    description: "One client’s interest in one property",
    icon: Sparkles,
  },
  {
    kind: "calendar" as const,
    label: "Calendar",
    description: "Meetings and inspections",
    icon: CalendarDays,
  },
  {
    kind: "client" as const,
    label: "Clients",
    description: "Client-only context",
    icon: UserRound,
  },
  {
    kind: "property" as const,
    label: "Properties",
    description: "Property-only context",
    icon: Building2,
  },
];

function contextRequest(context: CopilotContextSelection | undefined) {
  if (!context) return {};
  return {
    lead_id: context.leadId,
    listing_id: context.listingId,
    enquiry_id: context.enquiryId,
    conversation_id: context.conversationId,
    calendar_event_id: context.calendarEventId,
    calendar_source: context.calendarSource,
  };
}

function updateContextUrl(context?: CopilotContextSelection) {
  const url = new URL(window.location.href);
  const keys = [
    "lead_id",
    "listing_id",
    "enquiry_id",
    "conversation_id",
    "calendar_event_id",
    "calendar_source",
  ];
  keys.forEach((key) => url.searchParams.delete(key));

  const values = contextRequest(context);
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export function CopilotPage({
  contextItems,
  initialContext,
  initialPrompt = "",
}: {
  contextItems: CopilotContextItem[];
  initialContext: CopilotContextSelection;
  initialPrompt?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "G'day! I'm Clippy. Choose the client, property, enquiry or conversation I should work with, then tell me what you need.",
    },
  ]);
  const [input, setInput] = useState(() => initialPrompt.slice(0, 12_000));
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextSearch, setContextSearch] = useState("");
  const [activeContext, setActiveContext] = useState<CopilotContextItem | null>(
    () => resolveInitialCopilotContextItem(contextItems, initialContext),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!initialPrompt) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("prompt");
    window.history.replaceState(null, "", url.toString());
  }, [initialPrompt]);

  useEffect(() => {
    if (contextOpen) searchRef.current?.focus();
  }, [contextOpen]);

  const visibleContextItems = useMemo(() => {
    const query = contextSearch.trim().toLocaleLowerCase();
    if (!query) return contextItems;
    return contextItems.filter((item) =>
      `${item.label} ${item.description}`.toLocaleLowerCase().includes(query),
    );
  }, [contextItems, contextSearch]);

  const chooseContext = (item: CopilotContextItem) => {
    setActiveContext(item);
    setContextOpen(false);
    setContextSearch("");
    updateContextUrl(item.context);
  };

  const clearContext = () => {
    setActiveContext(null);
    setContextOpen(false);
    setContextSearch("");
    updateContextUrl();
  };

  const updateDraftAction = (
    messageId: string,
    patch: Partial<DraftActionState>,
  ) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId && message.draftAction
          ? {
              ...message,
              draftAction: { ...message.draftAction, ...patch },
            }
          : message,
      ),
    );
  };

  const approveDraft = async (messageId: string, action: DraftActionState) => {
    updateDraftAction(messageId, { status: "approving", error: undefined });
    try {
      const response = await fetch("/api/copilot/actions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_id: action.id,
          channel: action.channel,
          subject: action.subject,
          content: action.content,
          original_content: action.originalContent,
          ...contextRequest(action.context),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "The draft could not be approved.");
      }
      updateDraftAction(messageId, {
        status: "approved",
        approvedAt: result.approved_at,
        sent: Boolean(result.sent),
        recipient: result.recipient || action.recipient,
      });
    } catch (error) {
      updateDraftAction(messageId, {
        status: "draft",
        error:
          error instanceof Error
            ? error.message
            : "The draft could not be approved.",
      });
    }
  };

  const updateSlotAction = (
    messageId: string,
    patch: Partial<InspectionSlotActionState>,
  ) => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId && message.slotAction
          ? { ...message, slotAction: { ...message.slotAction, ...patch } }
          : message,
      ),
    );
  };

  const approveInspectionSlot = async (
    messageId: string,
    action: InspectionSlotActionState,
  ) => {
    updateSlotAction(messageId, { status: "creating", error: undefined });
    try {
      const response = await fetch("/api/copilot/actions/inspection-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: action.id,
          listing_id: action.listingId,
          starts_at: action.startsAt,
          ends_at: action.endsAt,
          capacity: action.capacity,
          inspection_type: action.inspectionType,
          slots: action.slots.map((slot) => ({
            starts_at: slot.startsAt,
            ends_at: slot.endsAt,
          })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          result.error || "The inspection slot could not be created.",
        );
      updateSlotAction(messageId, {
        status: "created",
        slotId: result.slots?.[0]?.id || result.slot?.id,
      });
    } catch (error) {
      updateSlotAction(messageId, {
        status: "pending",
        error:
          error instanceof Error
            ? error.message
            : "The inspection slot could not be created.",
      });
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-user`,
        role: "user",
        content: msg,
        contextLabel: activeContext
          ? `${activeContext.label} · ${activeContext.description}`
          : undefined,
      },
    ]);
    setInput("");
    setLoading(true);
    setThinkingStep(0);

    let stepIndex = 0;
    const stepInterval = window.setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= thinkingSteps.length) {
        window.clearInterval(stepInterval);
      } else {
        setThinkingStep(stepIndex);
      }
    }, 400);

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          ...contextRequest(activeContext?.context),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      window.clearInterval(stepInterval);
      setThinkingStep(thinkingSteps.length);

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply
          : "I received your message but don't have a response. Please try again.";
      const proposedDraftAction =
        data.proposed_action?.type === "message_draft"
          ? (data.proposed_action as ProposedDraftAction)
          : null;
      const proposedSlotAction =
        data.proposed_action?.type === "inspection_slot"
          ? (data.proposed_action as ProposedInspectionSlotAction)
          : null;

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: proposedDraftAction
            ? "I prepared an editable draft below. Review it carefully—nothing will be sent automatically."
            : reply,
          contextLabel: activeContext
            ? `${activeContext.label} · ${activeContext.description}`
            : undefined,
          draftAction: proposedDraftAction
            ? {
                ...proposedDraftAction,
                context: activeContext?.context || {},
                status: "draft",
              }
            : undefined,
          slotAction: proposedSlotAction
            ? { ...proposedSlotAction, status: "pending" }
            : undefined,
        },
      ]);
    } catch (error) {
      console.error("Copilot error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          content: `I couldn't send that message: ${message}. Please try again.`,
          contextLabel: activeContext
            ? `${activeContext.label} · ${activeContext.description}`
            : undefined,
        },
      ]);
    } finally {
      window.clearInterval(stepInterval);
      setLoading(false);
      setThinkingStep(0);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-50">
      <section className="relative z-20 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-neutral-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Working context
              </div>
              {activeContext ? (
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {activeContext.label}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {activeContext.description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-semibold text-neutral-800">
                    No client or property selected
                  </p>
                  <p className="text-xs text-neutral-500">
                    Clippy will answer generally and ask before assuming a
                    record.
                  </p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {activeContext && (
                <button
                  type="button"
                  onClick={clearContext}
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setContextOpen((open) => !open)}
                disabled={loading}
                aria-expanded={contextOpen}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {activeContext ? "Change context" : "Choose context"}
                <ChevronDown
                  className={`h-4 w-4 transition ${contextOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>

          {contextOpen && (
            <div className="absolute left-1/2 top-[calc(100%+8px)] max-h-[min(68vh,620px)] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
              <div className="border-b border-neutral-100 p-4">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    ref={searchRef}
                    value={contextSearch}
                    onChange={(event) => setContextSearch(event.target.value)}
                    placeholder="Search client, property, channel or event"
                    aria-label="Search Copilot contexts"
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <p className="mt-2 text-xs text-neutral-500">
                  Conversation and enquiry results keep the exact
                  client–property relationship together.
                </p>
              </div>

              <div className="max-h-[min(52vh,470px)] overflow-y-auto p-3">
                {contextGroups.map((group) => {
                  const groupItems = visibleContextItems
                    .filter((item) => item.kind === group.kind)
                    .slice(0, 12);
                  if (groupItems.length === 0) return null;
                  const Icon = group.icon;
                  return (
                    <div key={group.kind} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 px-2 pb-2">
                        <Icon className="h-4 w-4 text-emerald-600" />
                        <div>
                          <h3 className="text-xs font-semibold text-neutral-800">
                            {group.label}
                          </h3>
                          <p className="text-[11px] text-neutral-400">
                            {group.description}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {groupItems.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => chooseContext(item)}
                            className={`min-w-0 rounded-xl border px-3 py-2.5 text-left transition ${
                              activeContext?.key === item.key
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            <span className="block truncate text-sm font-semibold text-neutral-900">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-neutral-500">
                              {item.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {visibleContextItems.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <Search className="mx-auto h-7 w-7 text-neutral-300" />
                    <p className="mt-3 text-sm font-semibold text-neutral-800">
                      No matching context
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Try a client name, property address, channel or event.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            {message.role === "assistant" && (
              <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
            <div
              className={
                message.role === "user"
                  ? "max-w-2xl rounded-2xl rounded-br-none bg-emerald-500 px-5 py-3 text-white shadow-md"
                  : "max-w-2xl rounded-2xl rounded-bl-none border border-neutral-200 bg-white px-5 py-3 shadow-sm"
              }
            >
              {message.contextLabel && (
                <div
                  className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                    message.role === "user"
                      ? "text-white/70"
                      : "text-emerald-700"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {message.contextLabel}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
              {message.draftAction && (
                <DraftApprovalCard
                  action={message.draftAction}
                  onChange={(patch) => updateDraftAction(message.id, patch)}
                  onApprove={() =>
                    void approveDraft(message.id, message.draftAction!)
                  }
                />
              )}
              {message.slotAction && (
                <InspectionSlotApprovalCard
                  action={message.slotAction}
                  onChange={(patch) => updateSlotAction(message.id, patch)}
                  onApprove={() =>
                    void approveInspectionSlot(message.id, message.slotAction!)
                  }
                />
              )}
            </div>
            {message.role === "user" && (
              <div className="ml-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-500 shadow-md">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="mr-3 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="max-w-2xl flex-1 rounded-2xl rounded-bl-none border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                {thinkingSteps.map((step, index) => {
                  const isComplete = index < thinkingStep;
                  const isCurrent = index === thinkingStep;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : isCurrent ? (
                          <div className="flex gap-1">
                            {[0, 150, 300].map((delay) => (
                              <div
                                key={delay}
                                className="h-2 w-2 animate-bounce rounded-full bg-emerald-500"
                                style={{ animationDelay: `${delay}ms` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-neutral-200" />
                        )}
                      </div>
                      <span
                        className={
                          isComplete
                            ? "text-sm font-medium text-emerald-600"
                            : isCurrent
                              ? "text-sm font-medium text-neutral-800"
                              : "text-sm text-neutral-400"
                        }
                      >
                        {step}
                        {isCurrent && "..."}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-neutral-200 bg-white p-4">
        <div className="mx-auto max-w-4xl space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => void sendMessage(action.prompt)}
                disabled={loading}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeContext
                  ? `Ask Clippy about ${activeContext.label}...`
                  : "Ask Clippy a general question..."
              }
              aria-label="Message Clippy"
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-200 px-4 py-2.5 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-white shadow-md transition-all hover:bg-emerald-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-center text-xs text-neutral-400">
            Context is checked against your organisation · Enter to send ·
            Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
