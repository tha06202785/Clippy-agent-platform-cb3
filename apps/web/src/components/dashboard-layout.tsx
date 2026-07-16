"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import {
  BarChart3, Inbox, FileText, Sparkles, Bot, Users, Settings, LogOut, Calendar,
  Menu, X, Moon, Sun, Search, Plus, Home, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { QuickActions } from "@/components/quick-actions";
import { VoiceCommand } from "@/components/voice-command";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogPageView } from "@/components/posthog-pageview";
import { QueryProvider } from "@/components/query-provider";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "3" },
  { href: "/deals", label: "Deals", icon: FileText },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/briefing", label: "Briefing", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/monitoring", label: "Monitoring", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Settings },
  { href: "/import", label: "Import CRM", icon: Settings },
  { href: "/inspections", label: "Inspections", icon: Calendar },
  { href: "/admin", label: "Admin", icon: Settings },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: "", email: "", phone: "" });
  const [addingLead, setAddingLead] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header - always visible on small screens */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          {sidebarOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Clippy</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            {mounted && theme === "dark" ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
          </button>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo - desktop only */}
        <div className="hidden lg:flex items-center gap-3 px-5 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground">Clippy</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5">AI Co-Agent</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 pt-16 lg:pt-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {mounted && theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        {/* Top bar - desktop only */}
        <div className="hidden lg:flex items-center justify-between px-6 h-16 border-b border-border bg-card">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search leads, deals, or anything..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm">
              <Plus className="w-4 h-4" /><span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddLead(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Add New Lead</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Full name</label>
                <input type="text" value={newLead.full_name} onChange={(e) => setNewLead({...newLead, full_name: e.target.value})}
                  placeholder="Alex Johnson" className="w-full mt-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="alex@email.com" className="w-full mt-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input type="tel" value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="0400 000 000" className="w-full mt-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddLead(false)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={async () => {
                if (!newLead.full_name.trim()) return;
                setAddingLead(true);
                try {
                  await fetch("/api/leads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: newLead.full_name, email: newLead.email, phone: newLead.phone }),
                  });
                  setShowAddLead(false);
                  setNewLead({ full_name: "", email: "", phone: "" });
                  window.location.reload();
                } catch {}
                setAddingLead(false);
              }} disabled={addingLead || !newLead.full_name.trim()}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {addingLead ? "Adding..." : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <MobileNav onAddLead={() => setShowAddLead(true)} />
      <QuickActions onAddLead={() => setShowAddLead(true)} />
      <VoiceCommand />
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <QueryProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DashboardInner>{children}</DashboardInner>
          <Toaster richColors />
        </ThemeProvider>
      </QueryProvider>
      <PostHogPageView />
    </PostHogProvider>
  );
}
