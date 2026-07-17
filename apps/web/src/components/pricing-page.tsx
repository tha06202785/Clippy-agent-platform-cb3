"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, X, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  { id: "free", name: "Free", price: 0, desc: "Try before you buy", badge: null,
    features: [
      { text: "30 AI replies / month", included: true },
      { text: "5 listings", included: true },
      { text: "Basic inbox", included: true },
      { text: "Morning Briefing", included: true },
      { text: "WhatsApp / Gmail / Calendar", included: false },
      { text: "AI Copilot", included: false },
      { text: "Team features", included: false },
      { text: "Compliance monitoring", included: false },
    ], cta: "Get started", popular: false, audience: "individual" },
  { id: "starter", name: "Starter", price: 29, desc: "For agents getting started", badge: null,
    features: [
      { text: "500 AI replies / month", included: true },
      { text: "50 listings", included: true },
      { text: "WhatsApp / Gmail / Calendar", included: true },
      { text: "AI Copilot", included: true },
      { text: "Morning Briefing", included: true },
      { text: "Email support", included: true },
      { text: "Team features", included: false },
      { text: "Compliance monitoring", included: false },
    ], cta: "Start free trial", popular: false, audience: "individual" },
  { id: "team", name: "Team", price: 79, desc: "For teams of 2–5 agents", badge: "Most popular", isPerAgent: true,
    features: [
      { text: "Unlimited AI replies", included: true },
      { text: "Unlimited listings", included: true },
      { text: "Shared lead pool", included: true },
      { text: "Team inbox", included: true },
      { text: "Lead routing", included: true },
      { text: "Role-based access", included: true },
      { text: "Compliance monitoring", included: true },
      { text: "Priority support", included: true },
    ], cta: "Start free trial", popular: true, audience: "enterprise" },
  { id: "office", name: "Office", price: 149, desc: "For offices of 5–15 agents", badge: null, isPerAgent: true,
    features: [
      { text: "Everything in Team", included: true },
      { text: "AI Copilot per agent", included: true },
      { text: "API access", included: true },
      { text: "Advanced automations", included: true },
      { text: "Custom AI training", included: true },
      { text: "Bulk messaging", included: true },
      { text: "Board report PDF", included: true },
      { text: "Priority support", included: true },
    ], cta: "Start free trial", popular: false, audience: "enterprise" },
  { id: "agency", name: "Agency", price: 199, desc: "For brokerages 15+ agents", badge: null, isPerAgent: true,
    features: [
      { text: "Everything in Office", included: true },
      { text: "White-label branding", included: true },
      { text: "Executive dashboard", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom integrations", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Board report PDF", included: true },
      { text: "Custom AI training", included: true },
    ], cta: "Contact sales", popular: false, audience: "enterprise" },
];

export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [audience, setAudience] = useState<"individual" | "enterprise">("individual");
  const filtered = plans.filter(p => p.audience === audience);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">Pricing</span>
          <h1 className="mt-6 text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight text-foreground">Simple, transparent pricing</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Start free. Upgrade when you need more. No hidden fees.</p>
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted">
              <button onClick={() => setAudience("individual")}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", audience === "individual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <User className="w-4 h-4 inline mr-1.5" />For agents
              </button>
              <button onClick={() => setAudience("enterprise")}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", audience === "enterprise" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Building2 className="w-4 h-4 inline mr-1.5" />For teams and offices
              </button>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={cn("text-sm", !annual && "text-foreground font-semibold", annual && "text-muted-foreground")}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", annual ? "bg-primary" : "bg-muted")}>
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", annual ? "translate-x-6" : "translate-x-1")} />
            </button>
            <span className={cn("text-sm", annual && "text-foreground font-semibold", !annual && "text-muted-foreground")}>
              Annual <span className="text-emerald-500 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((plan) => {
            const price = annual ? Math.round(plan.price * 0.8) : plan.price;
            return (
              <div key={plan.id}
                className={cn("relative rounded-2xl border p-6 transition-all flex flex-col",
                  plan.popular ? "border-primary bg-card shadow-lg shadow-primary/10 scale-105" : "border-border bg-card hover:border-primary/50")}>
                {plan.badge && (
                  <span className={cn("absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground",
                    plan.popular ? "bg-primary" : "bg-muted text-muted-foreground")}>
                    {plan.badge}
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price > 0 ? "$" + price : "$" + plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.isPerAgent ? "/agent/mo" : "/month"}</span>
                  </div>
                  {plan.isPerAgent && <p className="text-[10px] text-muted-foreground mt-1">+ agents billed per seat</p>}
                </div>
                <Link href={plan.id === "enterprise" ? "/demo" : "/signup"}
                  className={cn("mt-auto flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all",
                    plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border bg-background text-foreground hover:bg-muted")}>
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat.text} className="flex items-start gap-2 text-sm">
                      {feat.included ? <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> : <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/40" />}
                      <span className={feat.included ? "text-foreground" : "text-muted-foreground/60"}>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
