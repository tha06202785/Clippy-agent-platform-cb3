"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Sun, MessageCircle, Users, Calendar, TrendingUp, Zap, Clock, AlertTriangle, Sparkles } from "lucide-react";

interface BriefingData {
  date: string;
  summary: string;
  metrics: {
    conversations_handled: number; new_leads: number; inspections_booked: number;
    inspections_attended: number; applications_submitted: number; hot_leads: number;
    warm_leads: number; pending_escalations: number; response_rate: number; avg_response_time: number;
  };
  hot_leads_list: Array<{ name: string; stage: string; value: string }>;
  new_leads_list: Array<{ name: string; source: string; time: string }>;
  inspections_today: Array<{ time: string; address: string; lead: string }>;
  escalations: Array<{ type: string; lead: string; reason: string }>;
}

export default function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/briefing/daily")
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); return; } setData(d); })
      .catch(() => setError("Failed to load briefing"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Briefing Available</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <p className="text-sm text-muted-foreground mt-4">Briefings are generated daily at 6:00 AM.</p>
      </div>
    );
  }

  if (!data) return null;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center gap-3">
        <Sun className="w-8 h-8 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">{greeting}</h1>
          <p className="text-muted-foreground mt-1">{data.date} - Here is your daily briefing</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-semibold text-emerald-800">While You Were Offline</h2></div>
        <p className="text-emerald-700 leading-relaxed">{data.summary}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{data.metrics.conversations_handled}</p>
          <p className="text-xs text-muted-foreground">Conversations</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{data.metrics.new_leads}</p>
          <p className="text-xs text-muted-foreground">New Leads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{data.metrics.inspections_booked}</p>
          <p className="text-xs text-muted-foreground">Inspections</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{data.metrics.hot_leads}</p>
          <p className="text-xs text-muted-foreground">Hot Leads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Zap className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{data.metrics.response_rate}%</p>
          <p className="text-xs text-muted-foreground">AI Response Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.hot_leads_list && data.hot_leads_list.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-red-500" /> Hot Leads</h2>
            <div className="space-y-3">
              {data.hot_leads_list.map((lead, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                  <div><p className="text-sm font-medium text-red-800">{lead.name}</p><p className="text-xs text-red-600">{lead.stage}</p></div>
                  <span className="text-sm font-bold text-red-700">{lead.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.inspections_today && data.inspections_today.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-500" /> Inspections Today</h2>
            <div className="space-y-3">
              {data.inspections_today.map((ins, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                  <div><p className="text-sm font-medium text-purple-800">{ins.address}</p><p className="text-xs text-purple-600">{ins.lead}</p></div>
                  <span className="text-sm font-bold text-purple-700">{ins.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {data.escalations && data.escalations.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-red-600" /><h2 className="text-lg font-semibold text-red-800">Needs Your Attention</h2></div>
          <div className="space-y-3">
            {data.escalations.map((esc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white">
                <div><p className="text-sm font-medium text-red-800">{esc.lead}</p><p className="text-xs text-red-600">{esc.reason}</p></div>
                <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">{esc.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.new_leads_list && data.new_leads_list.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> New Leads</h2>
          <div className="space-y-3">
            {data.new_leads_list.map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div><p className="text-sm font-medium text-foreground">{lead.name}</p><p className="text-xs text-muted-foreground">via {lead.source}</p></div>
                <span className="text-xs text-muted-foreground">{lead.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}