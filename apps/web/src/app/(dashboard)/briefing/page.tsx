"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { FileText, Calendar, Clock, ChevronRight, Sparkles } from "lucide-react";

interface Briefing {
  id: string; title: string; date: string; status: string;
}

export default function BriefingsPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/briefings")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBriefings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Briefings</h1>
          <p className="text-muted-foreground text-sm mt-1">Daily market briefings and II insights</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Sparkles className="w-4 h-4" /> Generate New
        </button>
      </div>

      {briefings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No briefings yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Generate your first daily briefing to get II-powered market insights.</p>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
            <Sparkles className="w-4 h-4 inline mr-1" /> Generate Morning Briefing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {briefings.map(b => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{b.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(b.date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.status}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
