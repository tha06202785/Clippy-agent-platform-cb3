"use client";
import { useState } from "react";
import { Phone, MessageCircle, Plus, X, Mic } from "lucide-react";

const actions = [
  { id: "call", label: "Call", icon: Phone, color: "bg-emerald-500" },
  { id: "text", label: "Text", icon: MessageCircle, color: "bg-blue-500" },
  { id: "lead", label: "Add lead", icon: Plus, color: "bg-primary" },
  { id: "note", label: "Voice note", icon: Mic, color: "bg-purple-500" },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && actions.map((action) => (
        <button key={action.id} onClick={() => setOpen(false)}
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
