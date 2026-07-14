"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import {
  BarChart3, Inbox, FileText, Sparkles, Bot, Users, Settings, LogOut,
  Menu, X, Moon, Sun, Search, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { QuickActions } from "@/components/quick-actions";
import { VoiceCommand } from "@/components/voice-command";
import { PostHogProvider } from "@/components/posthog-provider";
import { QueryProvider } from "@/components/query-provider";
import { PostHogPageView } from "@/components/posthog-pageview";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "3" },
  { href: "/deals", label: "Deals", icon: FileText },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: "", email: "", phone: "" });
  const [addingLead, setAddingLead] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <aside className="w-56 border-r border-border bg-card flex flex-col flex-shrink-0">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="font-bold text-foreground text-sm">Clippy</span>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}
                  className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                    active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-2 border-t border-border space-y-1">
            <Link href="/integrations" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Settings className="w-4 h-4" /> Integrations
            </Link>
            <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Settings className="w-4 h-4" /> Admin
            </Link>
            <button onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </aside>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search leads, deals..." className="w-64 pl-9 pr-4 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setShowAddLead(true)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm">
              <Plus className="w-4 h-4" /><span>Add Lead</span>
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                  {user.email?.[0]?.toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        {showAddLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddLead(false)}>
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-foreground mb-4">Add New Lead</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Full name</label>
                  <input type="text" value={newLead.full_name} onChange={(e) => setNewLead({...newLead, full_name: e.target.value})}
                    placeholder="Alex Johnson" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input type="email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                    placeholder="alex@email.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input type="tel" value={newLead.phone} onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    placeholder="0400 000 000" className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
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
        <MobileNav />
        <QuickActions />
        <VoiceCommand />
      </div>
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
/bin/bash: line 7: /c/Users/admin/AppData/Local/hermes/cache/terminal/hermes-cwd-2d747ec56451.txt: No such file or directory