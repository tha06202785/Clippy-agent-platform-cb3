"use client";
import { useState } from "react";
import { Phone, MessageCircle, Calendar, TrendingUp, AlertTriangle, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

export function MorningBriefing() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const briefing = {
    greeting: "Good morning, Sarah",
    date: "Thursday, July 9",
    summary: "You have 8 things needing attention today. 3 are urgent.",
    nonNegotiables: [
      { id: "1", type: "call", time: "10:00 AM", label: "Call James Wilson re: 45 Smith St offer", priority: "high" },
      { id: "2", type: "showing", time: "2:00 PM", label: "Show 22 Harbour Road to the Chen family", priority: "high" },
      { id: "3", type: "contract", time: "5:00 PM", label: "Deadline: counter-offer on 8 Ocean View", priority: "urgent" },
    ],
    coldLeads: [
      { name: "Michael Brown", lastContact: "5 days ago", value: ".2M", reason: "Stopped answering calls" },
      { name: "Lisa Taylor", lastContact: "3 days ago", value: ".8M", reason: "Said thinking about it" },
    ],
    suggestions: [
      { icon: MessageCircle, text: "Draft a follow-up for the Paddington open home (12 people)", action: "Draft now" },
      { icon: TrendingUp, text: "Price reduced on 15 Park St - notify 3 interested buyers", action: "Notify them" },
      { icon: Calendar, text: "Schedule inspection for 8 Ocean View - buyer requested Saturday", action: "Check calendar" },
    ],
    numbers: "3 showings · 7 messages unread · 2 offers pending · .2M in play",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{briefing.greeting}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{briefing.date}</p>
          <p className="text-sm text-foreground/80 mt-2">{briefing.summary}</p>
          <p className="text-xs text-muted-foreground mt-1">{briefing.numbers}</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Brief me
        </button>
      </div>

      {briefing.nonNegotiables.filter(n => n.priority === "urgent" && !dismissed.includes(n.id)).length > 0 && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-3">
            <AlertTriangle className="w-4 h-4" /> Urgent - needs action today
          </div>
          <div className="space-y-2">
            {briefing.nonNegotiables.filter(n => n.priority === "urgent").map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">Handle now</button>
                  <button onClick={() => setDismissed([...dismissed, item.id])} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Today's schedule
          </h2>
          <Link href="/calendar" className="text-xs text-primary hover:underline">Full day</Link>
        </div>
        <div className="space-y-3">
          {briefing.nonNegotiables.map((item) => (
            <div key={item.id} className="flex items-center gap-4 pb-3 border-b border-border last:border-0 last:pb-0">
              <div className="text-xs font-mono text-muted-foreground w-16 flex-shrink-0">{item.time}</div>
              <div className={"w-1.5 h-1.5 rounded-full flex-shrink-0 " + (item.priority === "urgent" ? "bg-red-500" : "bg-amber-500")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.label}</p>
              </div>
              <button className="text-xs text-primary hover:underline flex-shrink-0">View</button>
            </div>
          ))}
        </div>
      </div>

      {briefing.coldLeads.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3">
            <Clock className="w-4 h-4" /> Leads going cold - reach out today
          </div>
          <div className="space-y-2">
            {briefing.coldLeads.map((lead) => (
              <div key={lead.name} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.value} - {lead.reason} - Last contact {lead.lastContact}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Phone className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><MessageCircle className="w-4 h-4" /></button>
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90">AI draft</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Clippy noticed</h2>
        </div>
        <div className="space-y-3">
          {briefing.suggestions.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground flex-1">{s.text}</p>
                <button className="text-xs text-primary font-semibold hover:underline flex-shrink-0">{s.action}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "New lead", icon: "+", color: "bg-primary text-white" },
          { label: "Quick text", icon: "✉", color: "bg-blue-500 text-white" },
          { label: "Log call", icon: "📞", color: "bg-emerald-500 text-white" },
          { label: "Add note", icon: "📝", color: "bg-amber-500 text-white" },
        ].map((action) => (
          <button key={action.label} className={"flex flex-col items-center gap-1.5 p-4 rounded-xl " + action.color + " hover:opacity-90 transition-opacity"}>
            <span className="text-lg">{action.icon}</span>
            <span className="text-[10px] font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
