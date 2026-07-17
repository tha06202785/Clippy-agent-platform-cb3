"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { BarChart3, MessageCircle, Users, Calendar, AlertTriangle, TrendingUp, Clock, Activity, Zap, Target } from "lucide-react";

interface DashboardData {
  now: { conversations_active: number; messages_today: number; ai_messages: number; lead_messages: number; new_leads_today: number; inspections_booked_today: number; applications_started_today: number; pending_escalations: number; };
  week: { new_leads: number; inspections_booked: number; inspections_attended: number; inspections_no_show: number; applications_submitted: number; applications_approved: number; };
  pipeline: { hot_leads: number; warm_leads: number; total_leads: number; estimated_commission: number; by_stage: Record<string, number>; };
  performance: { avg_response_time_seconds: number; response_rate: number; ai_handled_percent: number; };
}

export default function PrincipalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/principal/dashboard")
      .then(r => r.json())
      .then(d => { if (d.now) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) return <div className="flex items-center justify-center h-64 text-muted-foreground">Unable to load dashboard data.</div>;

  const stageColors: Record<string, string> = {
    unknown: "bg-gray-100 text-gray-700", new: "bg-blue-100 text-blue-700", contacted: "bg-indigo-100 text-indigo-700",
    qualified: "bg-purple-100 text-purple-700", warm: "bg-amber-100 text-amber-700", hot: "bg-red-100 text-red-700",
    inspection_booked: "bg-emerald-100 text-emerald-700", offer: "bg-pink-100 text-pink-700",
    negotiation: "bg-orange-100 text-orange-700", won: "bg-green-100 text-green-700", lost: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Principal Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time agency performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Conversations</p>
            <MessageCircle className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{data.now.conversations_active}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.now.messages_today} messages today</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">New Leads</p>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{data.now.new_leads_today}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.week.new_leads} this week</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Inspections</p>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{data.now.inspections_booked_today}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.week.inspections_booked} this week</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pipeline Value</p>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">${(data.pipeline.estimated_commission || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.pipeline.hot_leads} hot, {data.pipeline.warm_leads} warm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-semibold text-foreground">AI Response Rate</h3></div>
          <p className="text-2xl font-bold text-foreground">{data.performance.response_rate}%</p>
          <p className="text-xs text-muted-foreground mt-1">of lead messages received an AI reply</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-semibold text-foreground">Avg Response Time</h3></div>
          <p className="text-2xl font-bold text-foreground">{data.performance.avg_response_time_seconds}s</p>
          <p className="text-xs text-muted-foreground mt-1">from lead message to AI reply</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-purple-500" /><h3 className="text-sm font-semibold text-foreground">AI Workload</h3></div>
          <p className="text-2xl font-bold text-foreground">{data.performance.ai_handled_percent}%</p>
          <p className="text-xs text-muted-foreground mt-1">of all messages handled by AI</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-foreground" /><h2 className="text-lg font-semibold text-foreground">Weekly Performance</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-2xl font-bold text-foreground">{data.week.new_leads}</p><p className="text-xs text-muted-foreground">New Leads</p></div>
          <div className="text-center p-3 rounded-lg bg-muted/50"><p className="text-2xl font-bold text-foreground">{data.week.inspections_booked}</p><p className="text-xs text-muted-foreground">Inspections Booked</p></div>
          <div className="text-center p-3 rounded-lg bg-emerald-50"><p className="text-2xl font-bold text-emerald-700">{data.week.inspections_attended}</p><p className="text-xs text-emerald-600">Attended</p></div>
          <div className="text-center p-3 rounded-lg bg-amber-50"><p className="text-2xl font-bold text-amber-700">{data.week.inspections_no_show}</p><p className="text-xs text-amber-600">No Show</p></div>
          <div className="text-center p-3 rounded-lg bg-purple-50"><p className="text-2xl font-bold text-purple-700">{data.week.applications_submitted}</p><p className="text-xs text-purple-600">Applications</p></div>
          <div className="text-center p-3 rounded-lg bg-emerald-50"><p className="text-2xl font-bold text-emerald-700">{data.week.applications_approved}</p><p className="text-xs text-emerald-600">Approved</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-foreground" /><h2 className="text-lg font-semibold text-foreground">Lead Pipeline</h2></div>
          <div className="space-y-2">
            {Object.entries(data.pipeline.by_stage).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className={"text-xs px-2 py-0.5 rounded " + (stageColors[stage] || "bg-muted text-muted-foreground")}>{stage.replace("_", " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: Math.min(100, (count / Math.max(1, data.pipeline.total_leads)) * 100) + "%" }} />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.pipeline.by_stage).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No leads yet</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">Total Leads</span>
            <span className="font-bold text-foreground">{data.pipeline.total_leads}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-foreground" /><h2 className="text-lg font-semibold text-foreground">Needs Attention</h2></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
              <div><p className="text-sm font-medium text-red-800">Pending Escalations</p><p className="text-xs text-red-600">Items requiring human review</p></div>
              <span className="text-xl font-bold text-red-700">{data.now.pending_escalations}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
              <div><p className="text-sm font-medium text-amber-800">Inspections No Show</p><p className="text-xs text-amber-600">This week</p></div>
              <span className="text-xl font-bold text-amber-700">{data.week.inspections_no_show}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
              <div><p className="text-sm font-medium text-blue-800">Applications to Review</p><p className="text-xs text-blue-600">Submitted, pending decision</p></div>
              <span className="text-xl font-bold text-blue-700">{data.week.applications_submitted - data.week.applications_approved}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-emerald-600" /><h2 className="text-lg font-semibold text-emerald-800">AI Workforce Summary</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-emerald-700 font-medium">AI Receptionist</p><p className="text-emerald-600">{data.now.conversations_active} conversations handled</p></div>
          <div><p className="text-emerald-700 font-medium">AI Sales Assistant</p><p className="text-emerald-600">{data.now.new_leads_today} leads qualified</p></div>
          <div><p className="text-emerald-700 font-medium">AI PM Assistant</p><p className="text-emerald-600">{data.now.inspections_booked_today} inspections booked</p></div>
          <div><p className="text-emerald-700 font-medium">AI Operations</p><p className="text-emerald-600">{data.performance.ai_handled_percent}% of messages automated</p></div>
        </div>
      </div>
    </div>
  );
}
