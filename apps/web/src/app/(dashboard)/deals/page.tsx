"use client";

import { useEffect, useState } from "react";
import {
  Home, Plus, TrendingUp, Clock, DollarSign, User,
  ChevronRight, MoreHorizontal, Sparkles, AlertCircle
} from "lucide-react";
import { QuickActions } from "@/components/quick-actions";

interface Deal {
  id: string;
  address: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  property_type: string | null;
  created_at: string;
  stage?: string;
  lead_name?: string;
}

const STAGES = [
  { id: "inquiry", label: "New Inquiry", color: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { id: "contacted", label: "Contacted", color: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  { id: "qualified", label: "Qualified", color: "bg-purple-500", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { id: "negotiation", label: "Negotiating", color: "bg-pink-500", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
  { id: "closed_won", label: "Won 🎉", color: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { id: "closed_lost", label: "Lost", color: "bg-slate-400", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600" },
];

const STAGE_ORDER = ["inquiry", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

function formatPrice(price: string | null) {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return price;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num}`;
}

function daysOnMarket(created: string) {
  const diff = Date.now() - new Date(created).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);

  useEffect(() => {
    fetch("/api/listings")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeals(data.map((l: any) => ({
            id: l.id,
            address: l.address,
            price: l.price,
            bedrooms: l.bedrooms,
            bathrooms: l.bathrooms,
            status: l.status || "active",
            property_type: l.property_type,
            created_at: l.created_at,
            stage: l.stage || "inquiry",
          })));
        } else {
          setDeals([]);
        }
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const dealsByStage = STAGE_ORDER.reduce((acc, stageId) => {
    acc[stageId] = deals.filter(d => d.stage === stageId || (stageId === "inquiry" && !d.stage));
    return acc;
  }, {} as Record<string, Deal[]>);

  const wonDeals = dealsByStage["closed_won"] || [];
  const totalValue = wonDeals.reduce((sum, d) => {
    const num = parseFloat((d.price || "0").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleStageMove = async (dealId: string, newStage: string) => {
    try {
      await fetch(`/api/listings/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} ·
            {wonDeals.length > 0 && ` ${wonDeals.length} closed · ${formatPrice(String(totalValue)) || "$0"} closed value`}
            {deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost").length > 0 &&
              ` · ${deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost").length} in progress`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("kanban")}
              className={"px-3 py-1.5 text-xs font-medium transition-colors " +
                (view === "kanban" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
              Board
            </button>
            <button onClick={() => setView("list")}
              className={"px-3 py-1.5 text-xs font-medium transition-colors " +
                (view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
              List
            </button>
          </div>
          <button onClick={() => setShowAddDeal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add deal
          </button>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <Home className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No deals yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add your first property listing to start tracking your pipeline. Each listing becomes a deal you can move through stages.
          </p>
          <button onClick={() => setShowAddDeal(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add your first deal
          </button>
        </div>
      ) : view === "kanban" ? (
        /* Kanban board */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={"w-2 h-2 rounded-full " + stage.color} />
                    <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                    <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div key={deal.id}
                      onClick={() => setActiveStage(activeStage === deal.id ? null : deal.id)}
                      className={"rounded-xl border bg-card p-4 cursor-pointer hover:border-primary/50 transition-all " +
                        (activeStage === deal.id ? "border-primary shadow-md" : "border-border")}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{deal.address}</p>
                        {deal.price && (
                          <p className="text-sm font-bold text-foreground ml-2 flex-shrink-0">
                            {formatPrice(deal.price)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        {deal.bedrooms && <span>{deal.bedrooms} bed</span>}
                        {deal.bedrooms && deal.bathrooms && <span>·</span>}
                        {deal.bathrooms && <span>{deal.bathrooms} bath</span>}
                        <span>·</span>
                        <span>{daysOnMarket(deal.created_at)}d</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold " + stage.bg + " " + stage.text}>
                          {stage.label}
                        </span>
                        <div className="flex gap-1">
                          {STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(deal.stage || "inquiry")).map((prevStage) => {
                            const nextIdx = STAGE_ORDER.indexOf(deal.stage || "inquiry");
                            const prevIdx = STAGE_ORDER.indexOf(prevStage);
                            if (prevIdx >= nextIdx - 1 && prevIdx < nextIdx) {
                              return (
                                <button key={prevStage}
                                  onClick={(e) => { e.stopPropagation(); handleStageMove(deal.id, prevStage); }}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title={"Move to " + (STAGES.find(s => s.id === prevStage)?.label)}>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground rotate-180" />
                                </button>
                              );
                            }
                            return null;
                          })}
                          {STAGE_ORDER.indexOf(deal.stage || "inquiry") < STAGE_ORDER.length - 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextIdx = STAGE_ORDER.indexOf(deal.stage || "inquiry") + 1;
                                handleStageMove(deal.id, STAGE_ORDER[nextIdx]);
                              }}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              title={"Move to " + (STAGES.find(s => s.id === STAGE_ORDER[STAGE_ORDER.indexOf(deal.stage || "inquiry") + 1])?.label)}>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                      <p className="text-xs text-muted-foreground">Drop deals here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Property", "Stage", "Bed/Bath", "Price", "Days", "Next Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => {
                const stage = STAGES.find(s => s.id === deal.stage) || STAGES[0];
                return (
                  <tr key={deal.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{deal.address}</p>
                      <p className="text-xs text-muted-foreground">{deal.property_type || "Property"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold " + stage.bg + " " + stage.text}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {[deal.bedrooms, deal.bathrooms].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">
                      {deal.price ? formatPrice(deal.price) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {daysOnMarket(deal.created_at)}d
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const nextIdx = Math.min(STAGE_ORDER.indexOf(deal.stage || "inquiry") + 1, STAGE_ORDER.length - 1);
                          handleStageMove(deal.id, STAGE_ORDER[nextIdx]);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors">
                        Advance <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddDeal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add New Deal</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Property Address</label>
                <input type="text" placeholder="123 Example St" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <input type="text" placeholder="50,000" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stage</label>
                  <select className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="inquiry">New Inquiry</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiating</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Bedrooms</label>
                  <input type="number" placeholder="3" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Bathrooms</label>
                  <input type="number" placeholder="2" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddDeal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={() => setShowAddDeal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  Create Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
