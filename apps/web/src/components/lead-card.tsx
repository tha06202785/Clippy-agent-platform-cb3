"use client";
import { Phone, MessageCircle, Mail } from "lucide-react";

interface LeadCardProps {
  name: string;
  status: "hot" | "warm" | "new" | "cold";
  preview: string;
  lastContact: string;
  value?: string;
  source: string;
  onCall: () => void;
  onText: () => void;
  onEmail: () => void;
}

const statusConfig = {
  hot: { color: "bg-red-500", label: "Call now" },
  warm: { color: "bg-amber-500", label: "Follow up" },
  new: { color: "bg-blue-500", label: "Introduce" },
  cold: { color: "bg-slate-400", label: "Re-engage" },
};

export function LeadCard({
  name,
  status,
  preview,
  lastContact,
  value,
  source,
  onCall,
  onText,
  onEmail,
}: LeadCardProps) {
  const cfg = statusConfig[status];
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors active:scale-[0.99]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm " +
              cfg.color
            }
          >
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={"w-1.5 h-1.5 rounded-full " + cfg.color} />
              <span className="text-[10px] text-muted-foreground uppercase">
                {cfg.label}
              </span>
              {value && (
                <span className="text-[10px] text-muted-foreground">
                  · {value}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">{lastContact}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {preview}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {source}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCall}
            className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
            title="Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onText}
            className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 transition-colors"
            title="Text"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEmail}
            className="p-2.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 active:bg-purple-200 transition-colors"
            title="Email"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
