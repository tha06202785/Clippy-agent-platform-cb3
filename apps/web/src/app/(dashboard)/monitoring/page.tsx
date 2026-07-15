"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Activity, CheckCircle, XCircle, Clock, RefreshCw, Server } from "lucide-react";

interface HealthCheck {
  name: string; url: string; status: "ok" | "error" | "checking"; lastCheck: string; latency: number;
}

export default function MonitoringPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([[
    { name: "Website", url: "https://useclippy.com", status: "checking", lastCheck: "", latency: 0 },
    { name: "API Health", url: "https://useclippy.com/api/health", status: "checking", lastCheck: "", latency: 0 },
    { name: "Subscription Plans", url: "https://useclippy.com/api/subscription/plans", status: "checking", lastCheck: "", latency: 0 },
  ]);
  const [uptime, setUptime] = useState({ total: 0, up: 0, down: 0 });

  const runCheck = async (index: number) => {
    setChecks(prev => prev.map((c, i) => i === index ? { ...c, status: "checking" } : c));
    const start = performance.now();
    try {
      await fetch(checks[index].url);
      const latency = Math.round(performance.now() - start);
      setChecks(prev => prev.map((c, i) => i === index ? { ...c, status: "ok", lastCheck: new Date().toLocaleTimeString(), latency } : c));
      setUptime(prev => ({ ...prev, total: prev.total + 1, up: prev.up + 1 }));
    } catch {
      setChecks(prev => prev.map((c, i) => i === index ? { ...c, status: "error", lastCheck: new Date().toLocaleTimeString(), latency: 0 } : c));
      setUptime(prev => ({ ...prev, total: prev.total + 1, down: prev.down + 1 }));
    }
  };

  const runAll = () => checks.forEach((_, i) => runCheck(i));
  useEffect(() => { runAll(); const interval = setInterval(runAll, 60000); return () => clearInterval(interval); }, []);

  const uptimePct = uptime.total > 0 ? Math.round((uptime.up / uptime.total) * 100) : 100;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">System health and uptime dashboard</p>
        </div>
        <button onClick={runAll} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
          <RefreshCw className="w-4 h-4" /> Check All
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <Activity className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{uptimePct}%</p>
          <p className="text-xs text-muted-foreground">Uptime</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <CheckCircle className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{uptime.up}</p>
          <p className="text-xs text-muted-foreground">Successful</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <XCircle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{uptime.down}</p>
          <p className="text-xs text-muted-foreground">Failures</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Clock className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{uptime.total}</p>
          <p className="text-xs text-muted-foreground">Total Checks</p>
        </div>
      </div>

      <div className="space-y-3">
        {checks.map((check, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={"w-3 h-3 rounded-full " + (check.status === "ok" ? "bg-emerald-500" : check.status === "error" ? "bg-red-500" : "bg-amber-400 animate-pulse")} />
              <div>
                <p className="font-medium text-foreground text-sm">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.url}</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {check.latency > 0 && <p>{check.latency}ms</p>}
              {check.lastCheck && <p>{check.lastCheck}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Server className="w-5 h-5 text-muted-foreground" /> Infrastructure
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Frontend</span><span className="text-foreground font-medium">Vercel (Next.js 15)</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="text-foreground font-medium">Supabase (Postgres)</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">AI</span><span className="text-foreground font-medium">Ollama Cloud</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Auth</span><span className="text-foreground font-medium">Supabase Auth</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payments</span><span className="text-foreground font-medium">Stripe</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Monitoring</span><span className="text-foreground font-medium">Sentry + PostHog + Cron</span></div>
        </div>
      </div>
    </div>
  );
}
