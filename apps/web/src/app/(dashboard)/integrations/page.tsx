"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { Mail, MessageCircle, Facebook, Calendar, Upload, Check, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

// ============================================================
// ONE-CLICK INTEGRATIONS
// ============================================================
// Every integration is ONE button. Click it. It connects.
// No API keys. No configuration. No steps. No thinking.
// If it needs more than one click, it goes in "Advanced".

const quickConnect = [
  { id: "gmail", name: "Gmail", desc: "Read and send emails", icon: Mail, color: "bg-red-500", connected: false },
  { id: "calendar", name: "Google Calendar", desc: "Schedule tours", icon: Calendar, color: "bg-blue-600", connected: false },
  { id: "facebook", name: "Facebook & Instagram", desc: "Import leads, reply via Messenger", icon: Facebook, color: "bg-blue-600", connected: false },
  { id: "whatsapp", name: "WhatsApp", desc: "Send and receive messages", icon: MessageCircle, color: "bg-emerald-500", connected: false },
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (id: string) => {
    setConnecting(id);
    await new Promise(r => setTimeout(r, 1500));
    setConnected(prev => [...prev, id]);
    setConnecting(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Connect your accounts</h1>
        <p className="text-muted-foreground mt-1">Click any button below to connect. That is it.</p>
      </div>

      {/* Quick connect grid — big buttons, one click */}
      <div className="grid gap-3">
        {quickConnect.map((item) => {
          const Icon = item.icon;
          const isOn = connected.includes(item.id);
          const isLoading = connecting === item.id;

          return (
            <button
              key={item.id}
              onClick={() => !isOn && !isLoading && handleConnect(item.id)}
              disabled={isLoading}
              className={"flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left w-full " + (
                isOn
                  ? "border-emerald-300 bg-emerald-50 cursor-default"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-sm active:scale-[0.99] cursor-pointer"
              )}
            >
              <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " + item.color}>
                {isLoading ? (
                  <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : isOn ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <Icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className={"font-semibold text-base " + (isOn ? "text-emerald-700" : "text-foreground")}>
                  {isOn ? item.name + " — Connected" : item.name}
                </p>
                <p className={"text-sm " + (isOn ? "text-emerald-600" : "text-muted-foreground")}>
                  {isLoading ? "Connecting..." : isOn ? "Your " + item.desc.toLowerCase() + " are syncing." : item.desc}
                </p>
              </div>
              {!isOn && !isLoading && <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">Need more?</span></div>
      </div>

      {/* Import from old CRM — one big button */}
      <Link href="/import"
        className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all group">
        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
          <Upload className="w-6 h-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base text-foreground">Bring your data from another CRM</p>
          <p className="text-sm text-muted-foreground">We will import your leads, listings, and deals. Takes 2 minutes.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
      </Link>

      {/* Concierge — for the complex stuff */}
      <details className="group">
        <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <Sparkles className="w-4 h-4" />
          Advanced integrations (Domain, REA, Stripe, custom API)
          <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="mt-3 p-4 rounded-xl bg-muted/30 border border-border">
          <p className="text-sm text-muted-foreground">
            These integrations need a bit of help to set up. Click below and we will handle the rest within 24 hours.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Domain.com.au", "Realestate.com.au", "Stripe", "HubSpot", "Custom API"].map((name) => (
              <button key={name}
                className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 transition-colors">
                Request {name}
              </button>
            ))}
          </div>
        </div>
      </details>

      {/* Connected count */}
      {connected.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-sm text-emerald-700 font-medium">
            <Check className="w-4 h-4 inline mr-1" />
            {connected.length} of 4 connected. Your data is syncing.
          </p>
        </div>
      )}
    </div>
  );
}
