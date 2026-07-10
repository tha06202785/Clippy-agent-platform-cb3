"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { label: "Draft a follow-up", prompt: "Draft a follow-up email for my hot leads" },
  { label: "Summarize my day", prompt: "Give me a summary of my pipeline and what needs attention today" },
  { label: "Find best leads", prompt: "Find my top 3 hottest leads right now" },
  { label: "Schedule a tour", prompt: "Schedule a property tour for tomorrow at 2pm" },
];

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", content: "Hi! I am Clippy, your AI co-agent. I can draft replies, schedule tours, update your pipeline, and more. What do you need?" },
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

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I processed your request. What else can I help with?",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
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
              {msg.content}
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
