"use client";

import { useState, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

const quickActions = [
  { label: "Draft follow-up", prompt: "Draft a follow-up email" },
  { label: "Generate captions", prompt: "Generate 3 property captions" },
  { label: "Compliance", prompt: "NSW strata disclosure requirements" },
  { label: "Schedule tour", prompt: "Schedule tour for tomorrow 2pm" },
];

export function CopilotPage() {
  const [messages, setMessages] = useState([
    { id: "1", role: "assistant", content: "G'day! I'm Clippy. How can I help today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [streamingText, setStreamingText] = useState("");

  const thinkingSteps = [
    "Reading your message",
    "Understanding context",
    "Checking your knowledge base",
    "Reviewing compliance requirements",
    "Drafting response",
    "Final review",
  ];

  const sendMessage = async (text: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    setThinkingStep(0);
    setStreamingText("");

    // Animate thinking steps
    const stepInterval = setInterval(() => {
      setThinkingStep((prev) => {
        if (prev >= thinkingSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      clearInterval(stepInterval);

      if (data.error) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Error: " + data.error }]);
      } else if (data.reply) {
        // Stream the response character by character (ChatGPT style)
        const fullText = data.reply;
        let currentIndex = 0;
        
        const streamInterval = setInterval(() => {
          if (currentIndex < fullText.length) {
            setStreamingText(fullText.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(streamInterval);
            setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: fullText }]);
            setStreamingText("");
          }
        }, 15); // 15ms per character = natural typing speed
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Network error" }]);
    } finally {
      setLoading(false);
      setThinkingStep(0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg: any) => (
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mr-3 mt-1 shadow-md flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-2xl bg-white border border-neutral-200 rounded-2xl rounded-bl-none p-5 shadow-sm flex-1">
              {/* Thinking indicator - ChatGPT style */}
              <div className="space-y-3 mb-4">
                {thinkingSteps.map((step, i) => {
                  const isComplete = i < thinkingStep;
                  const isCurrent = i === thinkingStep;
                  
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        {isComplete && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {isCurrent && (
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        )}
                        {!isComplete && !isCurrent && (
                          <div className="w-5 h-5 rounded-full border-2 border-neutral-200" />
                        )}
                      </div>
                      <span className={
                        isComplete ? "text-emerald-600 font-medium text-sm" :
                        isCurrent ? "text-neutral-800 font-medium text-sm" :
                        "text-neutral-400 text-sm"
                      }>
                        {step}
                        {isCurrent && <span className="animate-pulse">...</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Streaming text preview */}
              {streamingText && (
                <div className="border-t border-neutral-100 pt-4 mt-2">
                  <div className="text-sm text-neutral-600 mb-2 text-xs font-medium">Generating response:</div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed text-neutral-800">
                    {streamingText}
                    <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
