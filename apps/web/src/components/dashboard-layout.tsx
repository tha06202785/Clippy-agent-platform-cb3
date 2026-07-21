"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import {
  BarChart3, Brain, Inbox, FileText, Sparkles, Bot, Users, Settings, LogOut, Calendar, Clock,
  Menu, X, Moon, Sun, Search, Plus, Home, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { QuickActions } from "@/components/quick-actions";
import { VoiceCommand } from "@/components/voice-command";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogPageView } from "@/components/posthog-pageview";
import { QueryProvider } from "@/components/query-provider";

type NavItem = { href: string; label: string; icon: any; badge?: string; color?: string };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Sparkles, color: "text-emerald-500" },
  { href: "/inbox", label: "Inbox", icon: Inbox, color: "text-blue-500" },
  { href: "/deals", label: "Deals", icon: FileText, color: "text-orange-500" },
  { href: "/copilot", label: "AI Copilot", icon: Bot, color: "text-purple-500" },
  { href: "/briefing", label: "Briefing", icon: FileText, color: "text-yellow-500" },
  { href: "/knowledge", label: "Knowledge", icon: Brain, color: "text-mint-500" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, color: "text-pink-500" },
  { href: "/monitoring", label: "Monitoring", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users, color: "text-blue-500" },
  { href: "/integrations", label: "Integrations", icon: Settings, color: "text-pink-500" },
  { href: "/import", label: "Import CRM", icon: Settings },
  { href: "/inspections", label: "Inspections", icon: Calendar, color: "text-purple-500" },
  { href: "/inspections/slots", label: "Time Slots", icon: Clock },
  { href: "/inspections/applications", label: "Applications", icon: FileText },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/onboarding", label: "Onboarding", icon: Sparkles, color: "text-emerald-500" },
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/conversations/unread")
      .then(r => r.json())
      .then(data => setUnreadCount(data.count || 0))
      .catch(() => setUnreadCount(0));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ leads: any[]; deals: any[] }>({ leads: [], deals: [] });
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  let searchTimer: ReturnType<typeof setTimeout>;
  const [newLead, setNewLead] = useState({ full_name: "", email: "", phone: "" });
  const [addingLead, setAddingLead] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
          {sidebarOpen ? <X className="w-5 h-5 text-neutral-800" /> : <Menu className="w-5 h-5 text-neutral-800" />}
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-neutral-800">Clippy</span>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-xl hover:bg-neutral-100 transition-colors">
            {mounted && theme === "dark" ? <Sun className="w-4 h-4 text-neutral-800" /> : <Moon className="w-4 h-4 text-neutral-800" />}
          </button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Glass Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-white/90 backdrop-blur-xl border-r border-neutral-200 flex flex-col transition-transform duration-300 ease-in-out shadow-soft",
        sidebarOpen ? "translate-x-0" : "-translate-x-64"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-200">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-neutral-800">Clippy</span>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group",
                  isActive
                    ? "bg-gradient-to-r from-pastel-blue to-pastel-mint text-neutral-800 shadow-soft"
                    : "text-neutral-600 hover:bg-neutral-100 hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : item.color || "text-neutral-400", "group-hover:scale-110 transition-transform")} />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        sidebarOpen ? "lg:ml-64" : "lg:ml-0"
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors">
                {sidebarOpen ? <Menu className="w-5 h-5 text-neutral-800" /> : <Menu className="w-5 h-5 text-neutral-800" />}
              </button>
              <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl hover:bg-neutral-100 transition-colors hidden md:block"
              >
                {mounted && theme === "dark" ? <Sun className="w-5 h-5 text-neutral-800" /> : <Moon className="w-5 h-5 text-neutral-800" />}
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center border-2 border-white shadow-soft">
                <span className="text-sm font-bold text-neutral-800">T</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <MobileNav />

      {/* Quick Actions FAB */}
      <QuickActions />

      {/* Voice Command */}
      <VoiceCommand />

      {/* Toaster */}
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <PostHogProvider>
        <PostHogPageView />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <DashboardInner>{children}</DashboardInner>
        </ThemeProvider>
      </PostHogProvider>
    </QueryProvider>
  );
}
