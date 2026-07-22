"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { label: "Draft a follow-up", prompt: "Draft a follow-up email for my hot leads" },
  { label: "Generate captions", prompt: "Generate 3 caption options for a 4-bedroom, 2-bathroom house in Paddington, NSW with a renovated kitchen and north-facing backyard. Open home this Saturday 2-3pm" },
  { label: "Compliance check", prompt: "What do I need to disclose when selling a strata unit in NSW?" },
  { label: "Schedule a tour", prompt: "Schedule a property tour for tomorrow at 2pm" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function MessageContent({ content }: { content: string }) {
  const sections = content.split(/
[-=]{10,}
/);

  if (sections.length <= 1) {
    return (
      <div className="relative group">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={content} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;
        return (
          <div key={i} className="relative group rounded-lg border border-border/50 bg-card/50 p-3">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{trimmed}</div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={trimmed} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "G'day! I'm Clippy, your real estate co-agent. Ready to help you with:

• Drafting lead replies & follow-ups
• Property captions for socials/listings
• Compliance checks (all states)
• Email/SMS/WhatsApp messages

What are you working on today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    const msg = content || input;
    if (!msg.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Error: " + data.error,
        }]);
      } else if (data.reply) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I received your message but could not generate a response. The AI service may be temporarily unavailable. Please try again.",
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Network error: Could not reach the AI service. Please check your connection and try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 md:-m-6 lg:-m-8">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={"flex gap-3 " + (msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={"max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed " +
              (msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-none"
                : "bg-card border border-border text-foreground rounded-bl-none"
              )}>
              <MessageContent content={msg.content} />
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-neutral-700" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-pastel-lavender/50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Clippy anything..."
              className="flex-1 px-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
