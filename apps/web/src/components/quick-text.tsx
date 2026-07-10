"use client";
import { useState } from "react";
import { Send, X, Sparkles } from "lucide-react";

const templates = [
  "Hi {name}, just following up on our conversation about {property}. Let me know if you have any questions!",
  "Great news! I have a new property that matches what you are looking for at {property}. Available this weekend?",
  "Hi {name}, confirming our appointment at {property} on {date} at {time}. See you then!",
  "Thanks for your interest in {property}. I have sent through the details. Let me know your thoughts!",
];

interface QuickTextProps {
  onClose: () => void;
  contactName?: string;
  contactPhone?: string;
}

export function QuickText({ onClose, contactName, contactPhone }: QuickTextProps) {
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const handleTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    setMessage(templates[idx].replace(/{name}/g, contactName || "there").replace(/{property}/g, "your dream home").replace(/{date}/g, "tomorrow").replace(/{time}/g, "2pm"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-md shadow-xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Quick text</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {contactName && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
              {contactName.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{contactName}</p>
              <p className="text-xs text-muted-foreground">{contactPhone}</p>
            </div>
          </div>
        )}
        <div className="mb-4">
          <div className="flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">AI suggestions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Follow up", "Schedule tour", "Confirm appointment", "Share property", "Price drop"].map((t) => (
              <button key={t} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">{t}</button>
            ))}
          </div>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." rows={3}
          className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
        <div className="flex items-center gap-2 mt-4">
          <button disabled={!message.trim()}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> Send via WhatsApp
          </button>
          <button className="px-4 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">SMS</button>
        </div>
      </div>
    </div>
  );
}
