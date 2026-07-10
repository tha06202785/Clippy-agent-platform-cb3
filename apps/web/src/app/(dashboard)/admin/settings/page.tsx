"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { Save, Globe, Palette, Bell, Shield, Users, Image } from "lucide-react";

export default function AdminSettingsPage() {
  const [brandName, setBrandName] = useState("Premier Realty Group");
  const [brandColor, setBrandColor] = useState("#10b981");
  const [logo, setLogo] = useState("");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your brokerage settings and branding</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Branding
        </h2>
        <div>
          <label className="text-sm font-medium text-foreground">Brokerage name</label>
          <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Brand color</label>
          <div className="flex items-center gap-3 mt-1">
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-input cursor-pointer" />
            <span className="text-sm text-muted-foreground">{brandColor}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Logo</label>
          <div className="mt-1 flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors">
            <Image className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-foreground">Upload your logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> White-label
        </h2>
        <div className="space-y-4">
          {[
            { label: "Custom domain", desc: "Use your own domain (e.g., app.yourbrokerage.com)", enabled: false },
            { label: "Remove Clippy branding", desc: "Hide 'Powered by Clippy' from agent dashboards", enabled: false },
            { label: "Custom email domain", desc: "Send emails from your domain (e.g., clippy@yourbrokerage.com)", enabled: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors bg-muted">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Access control
        </h2>
        <div className="space-y-3">
          {[
            { role: "Admin", desc: "Full access to all settings, billing, and agent management", count: 2 },
            { role: "Office manager", desc: "Can manage their office agents and view reports", count: 6 },
            { role: "Agent", desc: "Can only see their own leads, deals, and pipeline", count: 239 },
          ].map((role) => (
            <div key={role.role} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium text-foreground">{role.role}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{role.desc}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{role.count}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> Save settings
      </button>
    </div>
  );
}
