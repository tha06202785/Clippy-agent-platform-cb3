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
  // Split on copy-box separators (--- or ==== lines)
  const sections = content.split(/\n[-=]{10,}\n/);

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
        const isHeading = trimmed.startsWith("#") || trimmed.startsWith("**");
        return (
          <div key={i} className="relative group rounded-lg border border-border/50 bg-card/50 p-3">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{trimmed}</div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={trimmed} />
            </div>
          </div>
        );
      })}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={content} />
      </div>
    </div>
  );
}

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "G'day! I'm Clippy, your real estate co-agent. Ready to help you with:\n\n• Drafting lead replies & follow-ups\n• Property captions for socials/listings\n• Compliance checks (all states)\n• Email/SMS/WhatsApp messages\n\nWhat are you working on today?" },
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
        body: JSON.stringify({ messages: [{ role: "user", content: msg }] }),
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
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 md:px-6 pb-4">
          <p className="text-xs text-muted-foreground mb-3 text-center">Try asking Clippy to...</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => sendMessage(action.prompt)} disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-colors disabled:opacity-50">
                <Sparkles className="w-3 h-3 inline mr-1" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border p-4 md:p-6">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask Clippy to draft, schedule, or find something..."
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
