"use client";
import { useState } from "react";
import { Phone, MessageCircle, Plus, X, Mic } from "lucide-react";

const actions = [
  { id: "call", label: "Call", icon: Phone, color: "bg-emerald-500", action: "call" },
  { id: "text", label: "Text", icon: MessageCircle, color: "bg-blue-500", action: "text" },
  { id: "lead", label: "Add lead", icon: Plus, color: "bg-primary", action: "lead" },
  { id: "note", label: "Voice note", icon: Mic, color: "bg-purple-500", action: "voice" },
];

export function QuickActions({ onAddLead }: { onAddLead?: () => void }) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: string) => {
    setOpen(false);
    switch (action) {
      case "lead":
        if (onAddLead) onAddLead();
        break;
      case "call":
        const phone = prompt("Enter phone number to call:");
        if (phone) window.location.href = "tel:" + phone.replace(/[^0-9+]/g, "");
        break;
      case "text":
        const smsNumber = prompt("Enter phone number to text:");
        if (smsNumber) window.location.href = "sms:" + smsNumber.replace(/[^0-9+]/g, "");
        break;
      case "voice":
        // Trigger voice command
        const voiceBtn = document.querySelector('[data-voice-btn]') as HTMLButtonElement;
        if (voiceBtn) voiceBtn.click();
        break;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && actions.map((action) => (
        <button key={action.id} onClick={() => handleAction(action.action)}
          className={"flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold shadow-lg hover:scale-105 transition-all " + action.color}>
          <action.icon className="w-4 h-4" />
          <span>{action.label}</span>
        </button>
      ))}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-xl hover:scale-110 transition-all flex items-center justify-center">
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}
