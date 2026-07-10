"use client";

import { FileText, Home, TrendingUp } from "lucide-react";

const deals = [
  { id: "1", name: "22 Harbour Road", address: "22 Harbour Road, Sydney NSW 2000", price: ",450,000", stage: "offer", status: "active", daysOnMarket: 14 },
  { id: "2", name: "45 Smith Street", address: "45 Smith Street, Paddington NSW 2021", price: ",850,000", stage: "inspecting", status: "active", daysOnMarket: 7 },
  { id: "3", name: "123 Main St", address: "123 Main St, Surry Hills NSW 2010", price: ",200,000", stage: "contract", status: "active", daysOnMarket: 21 },
  { id: "4", name: "8 Ocean View", address: "8 Ocean View, Bondi NSW 2026", price: ",100,000", stage: "qualification", status: "active", daysOnMarket: 3 },
];

const stageColors: Record<string, string> = {
  qualification: "bg-blue-500",
  searching: "bg-purple-500",
  inspecting: "bg-amber-500",
  offer: "bg-red-500",
  contract: "bg-emerald-500",
  exchanged: "bg-green-600",
  lost: "bg-slate-400",
};

export function DealsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deals</h1>
          <p className="text-muted-foreground mt-1">Manage your active property deals</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
          + New Deal
        </button>
      </div>

      <div className="grid gap-4">
        {deals.map((deal) => (
          <div key={deal.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{deal.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{deal.address}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-semibold text-foreground">{deal.price}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {deal.daysOnMarket} days on market
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white " + stageColors[deal.stage]}>
                  {deal.stage}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
