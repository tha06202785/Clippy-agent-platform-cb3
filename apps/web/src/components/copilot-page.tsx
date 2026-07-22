"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Check } from "lucide-react";

const quickActions = [
  { label: "Draft follow-up", prompt: "Draft a follow-up email" },
  { label: "Generate captions", prompt: "Generate 3 property captions" },
  { label: "Compliance", prompt: "NSW strata disclosure requirements" },
  { label: "Schedule tour", prompt: "Schedule tour for tomorrow 2pm" },
];

const progressSteps = [
  { text: "Reading your message...", icon: "👁️" },
  { text: "Analyzing context...", icon: "🧠" },
  { text: "Checking knowledge base...", icon: "📚" },
  { text: "Drafting response...", icon: "✍️" },
  { text: "Reviewing compliance...", icon: "✅" },
  { text: "Finalizing...", icon: "✨" },
];

export function CopilotPage() {
  const [messages, setMessages] = useState([
    { id: "1", role: "assistant", content: "G'day! I'm Clippy. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    setProgressStep(0);

    const progressInterval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev >= progressSteps.length - 1) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      clearInterval(progressInterval);

      if (data.error) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Error: " + data.error }]);
      } else if (data.reply) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error" }]);
    } finally {
      setLoading(false);
      setProgressStep(0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "assistant" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            <div className={
              msg.role === "user"
                ? "max-w-2xl px-5 py-3 rounded-2xl bg-emerald-500 text-white rounded-br-none shadow-md"
                : "max-w-2xl px-5 py-3 rounded-2xl bg-white border border-neutral-200 rounded-bl-none shadow-sm"
            }>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center ml-3 mt-1 shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
              <div className="space-y-2">
                {progressSteps.map((step, i) => {
                  const isComplete = i < progressStep;
                  const isCurrent = i === progressStep;
                  const opacityClass = isComplete || isCurrent ? "opacity-100" : "opacity-30";
                  const colorClass = isCurrent ? "text-emerald-600 font-medium" : "text-neutral-600";
                  const icon = isComplete ? "✅" : (step.text.includes("Finalizing") && isCurrent ? "✨" : step.icon);
                  
                  return (
                    <div key={i} className={opacityClass + " flex items-center gap-2 text-sm transition-all duration-300"}>
                      <span className="text-base">{icon}</span>
                      <span className={colorClass}>{step.text}</span>
                    </div>
                  );
                })}
                {progressStep < progressSteps.length - 1 && (
                  <div className="flex items-center gap-1 pt-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-200 p-4 bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
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
              placeholder="Ask Clippy anything..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage("")}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
