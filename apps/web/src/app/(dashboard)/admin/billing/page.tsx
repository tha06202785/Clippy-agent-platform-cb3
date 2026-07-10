"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { DollarSign, Download, CreditCard, FileText, CheckCircle, AlertCircle } from "lucide-react";

const invoices = [
  { id: "INV-001", date: "Jul 1, 2026", plan: "Enterprise (6 offices)", amount: ",999", status: "paid", agents: 247 },
  { id: "INV-002", date: "Jun 1, 2026", plan: "Enterprise (6 offices)", amount: ",999", status: "paid", agents: 245 },
  { id: "INV-003", date: "May 1, 2026", plan: "Enterprise (5 offices)", amount: ",499", status: "paid", agents: 210 },
  { id: "INV-004", date: "Apr 1, 2026", plan: "Enterprise (5 offices)", amount: ",499", status: "paid", agents: 198 },
  { id: "INV-005", date: "Mar 1, 2026", plan: "Enterprise (4 offices)", amount: ",499", status: "paid", agents: 175 },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your subscription and invoices</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">Manage subscription</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <CreditCard className="w-5 h-5 text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p className="text-lg font-bold text-foreground mt-1">Enterprise</p>
          <p className="text-sm text-muted-foreground">,999/month · 6 offices · 247 agents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <DollarSign className="w-5 h-5 text-emerald-500 mb-3" />
          <p className="text-xs text-muted-foreground">Monthly spend</p>
          <p className="text-lg font-bold text-foreground mt-1">,999</p>
          <p className="text-sm text-muted-foreground">6.19 per agent</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <CheckCircle className="w-5 h-5 text-emerald-500 mb-3" />
          <p className="text-xs text-muted-foreground">Payment status</p>
          <p className="text-lg font-bold text-emerald-500 mt-1">Current</p>
          <p className="text-sm text-muted-foreground">Next payment Aug 1, 2026</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Invoice history</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 text-sm font-medium text-foreground">{inv.id}</td>
                <td className="p-4 text-sm text-muted-foreground">{inv.date}</td>
                <td className="p-4 text-sm text-muted-foreground">{inv.plan}</td>
                <td className="p-4 text-right text-sm font-semibold text-foreground">{inv.amount}</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Paid
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
