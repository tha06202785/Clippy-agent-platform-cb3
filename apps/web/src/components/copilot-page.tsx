"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";

const quickActions = [
  { label: "Draft follow-up", prompt: "Draft a follow-up email" },
  { label: "Generate captions", prompt: "Generate 3 property captions" },
  { label: "Compliance", prompt: "NSW strata disclosure requirements" },
  { label: "Schedule tour", prompt: "Schedule tour for tomorrow 2pm" },
];

const thinkingSteps = [
  "Reading your message",
  "Understanding context",
  "Checking your knowledge base",
  "Reviewing compliance requirements",
  "Drafting response",
  "Final review",
];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "assistant", content: "G'day! I'm Clippy. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: "user", content: msg },
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
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      window.clearInterval(stepInterval);
      setThinkingStep(thinkingSteps.length);

      const content =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply
          : "I received your message but don't have a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-assistant`, role: "assistant", content },
      ]);
    } catch (error) {
      console.error("Copilot error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          content: `I couldn't send that message: ${message}. Please try again.`,
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
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "assistant" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-md flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div
              className={
                msg.role === "user"
                  ? "max-w-2xl px-5 py-3 rounded-2xl bg-emerald-500 text-white rounded-br-none shadow-md"
                  : "max-w-2xl px-5 py-3 rounded-2xl bg-white border border-neutral-200 rounded-bl-none shadow-sm"
              }
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center ml-3 mt-1 shadow-md flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-md flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl rounded-bl-none p-5 shadow-sm flex-1">
              <div className="space-y-3">
                {thinkingSteps.map((step, i) => {
                  const isComplete = i < thinkingStep;
                  const isCurrent = i === thinkingStep;

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {isComplete ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isCurrent ? (
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-neutral-200" />
                        )}
                      </div>
                      <span
                        className={
                          isComplete
                            ? "text-emerald-600 font-medium text-sm"
                            : isCurrent
                              ? "text-neutral-800 font-medium text-sm"
                              : "text-neutral-400 text-sm"
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

      <div className="border-t border-neutral-200 p-4 bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => void sendMessage(action.prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
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
              placeholder="Ask Clippy anything..."
              aria-label="Message Clippy"
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-xs text-neutral-400">Enter to send · Shift+Enter for a new line</p>
        </div>
      </div>
    </div>
  );
}
