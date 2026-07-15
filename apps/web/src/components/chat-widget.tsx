"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Mail, Phone } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"collect" | "chat">("collect");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startChat = async () => {
    if (!name.trim() || !email.trim()) return;
    setStep("chat");
    setMessages([{
      id: "0", role: "ai",
      content: "Thanks " + name + "! I'm Clippy, your AI real estate assistant. How can I help you today? Looking to buy, sell, or have a question about a property?"
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput("");

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "7f91a043-805b-4e67-83ab-36b14bf85898",
          channel: "website",
          leadId,
          conversationId: convId,
          message: msg,
          metadata: { name, email, phone },
        }),
      });
      const data = await res.json();

      if (data.conversationId) setConvId(data.conversationId);
      if (data.leadId) setLeadId(data.leadId);

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.reply || "Thanks for your message! I'll get back to you shortly.",
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I'm having trouble connecting. Please try again or call us directly.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center">
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">Clippy AI</span>
        </div>
        <button onClick={() => setOpen(false)} className="hover:opacity-80">
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === "collect" ? (
        /* Collect name + contact first */
        <div className="p-6 space-y-4">
          <div className="text-center">
            <Bot className="w-10 h-10 text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Hi there!</h3>
            <p className="text-xs text-muted-foreground mt-1">Leave your details and I'll help you find the perfect property.</p>
          </div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name *"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email *"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone (optional)"
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={startChat} disabled={!name.trim() || !email.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            Start Chat
          </button>
          <p className="text-[10px] text-muted-foreground text-center">We respect your privacy. No spam, ever.</p>
        </div>
      ) : (
        /* Chat mode */
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
            {messages.map((msg) => (
              <div key={msg.id} className={"flex gap-2 " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={"max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed " +
                  (msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about a property..."
                className="flex-1 px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
