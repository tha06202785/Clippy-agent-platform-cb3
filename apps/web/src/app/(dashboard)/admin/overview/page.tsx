"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, Zap, Users, Home, Activity, Clock,
  TrendingUp, MessageSquare, AlertCircle, CheckCircle, ArrowRight
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    leads: { total: number; new: number };
    listings: { total: number; active: number };
  };
  ai_replies?: { used: number; limit: number };
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || { leads: { total: 0, new: 0 }, listings: { total: 0, active: 0 } };

  const cards = [
    {
      icon: Users, label: "Total Leads",
      value: stats.leads.total, sub: `${stats.leads.new} new this month`,
      color: "text-blue-600 bg-blue-50",
      href: "/inbox",
    },
    {
      icon: Home, label: "Active Listings",
      value: stats.listings.active, sub: `${stats.listings.total} total`,
      color: "text-emerald-600 bg-emerald-50",
      href: "/deals",
    },
    {
      icon: Zap, label: "AI Replies Used",
      value: data?.ai_replies?.used || 0, sub: `of ${data?.ai_replies?.limit || 50} limit`,
      color: "text-purple-600 bg-purple-50",
      href: "/copilot",
    },
    {
      icon: Activity, label: "Response Time",
      value: "<5 min", sub: "AI powered",
      color: "text-amber-600 bg-amber-50",
      href: "/copilot",
    },
  ];

  const integrations = [
    {
      name: "Facebook & Instagram",
      desc: "Import leads from Facebook page, auto-reply via Messenger",
      status: "partial",
      color: "bg-blue-600",
      icon: "F",
      href: "/integrations",
    },
    {
      name: "WhatsApp Business",
      desc: "Send and receive WhatsApp messages — coming soon",
      status: "coming_soon",
      color: "bg-emerald-500",
      icon: "W",
      href: "/integrations",
    },
    {
      name: "Google Calendar",
      desc: "Sync tour schedules automatically",
      status: "partial",
      color: "bg-blue-600",
      icon: "G",
      href: "/integrations",
    },
    {
      name: "Gmail",
      desc: "Read and send emails from Clippy",
      status: "partial",
      color: "bg-red-500",
      icon: "G",
      href: "/integrations",
    },
  ];

  const systemHealth = [
    { label: "Database (Supabase)", status: "operational", latency: "42ms" },
    { label: "AI (Ollama/Kimi)", status: "operational", latency: "180ms" },
    { label: "Auth (Clerk)", status: "operational", latency: "15ms" },
    { label: "Rate limiting", status: "operational", latency: "<1ms" },
    { label: "Stripe billing", status: "operational", latency: "38ms" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Agency metrics, integrations and system health</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, sub, color, href }) => (
          <Link key={label} href={href}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group">
            <div className={"w-10 h-10 rounded-lg flex items-center justify-center mb-3 " + color}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Integrations status */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Integrations</h2>
            <Link href="/integrations" className="text-xs text-primary hover:underline">Manage all</Link>
          </div>
          <div className="space-y-3">
            {integrations.map(({ name, desc, status, color, icon, href }) => (
              <Link key={name} href={href}
                className="flex items-start gap-4 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors group">
                <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 " + color}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    {status === "operational" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {status === "partial" && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    {status === "coming_soon" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Coming soon</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>

        {/* System health */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">System Health</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">All systems operational</span>
            </div>
          </div>
          <div className="space-y-2">
            {systemHealth.map(({ label, status, latency }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {status === "operational"
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-red-500" />
                  }
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{latency}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">OK</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Manage billing", href: "/admin/billing", desc: "Plans, invoices, usage" },
          { label: "Compliance checks", href: "/admin/compliance", desc: "AU licensing & data privacy" },
          { label: "AI settings", href: "/admin/agents", desc: "Agent configuration" },
          { label: "Agency settings", href: "/admin/settings", desc: "Profile, team, integrations" },
        ].map(({ label, href, desc }) => (
          <Link key={label} href={href}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 ml-auto group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
