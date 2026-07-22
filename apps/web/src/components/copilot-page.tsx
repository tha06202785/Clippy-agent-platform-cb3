"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { label: "Draft follow-up", prompt: "Draft a follow-up email" },
  { label: "Generate captions", prompt: "Generate 3 property captions" },
  { label: "Compliance", prompt: "NSW strata disclosure requirements" },
  { label: "Schedule tour", prompt: "Schedule tour for tomorrow 2pm" },
];

export function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "G'day! I'm Clippy. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const msg = text || input;
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

      if (data.error) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Error: " + data.error }]);
      } else if (data.reply) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mr-3 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={
              msg.role === "user"
                ? "max-w-2xl px-4 py-3 rounded-2xl bg-emerald-500 text-white rounded-br-none"
                : "max-w-2xl px-4 py-3 rounded-2xl bg-white border rounded-bl-none"
            }>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ml-3 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Clippy..."
              className="flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage("")}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
