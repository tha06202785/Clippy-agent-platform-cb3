"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  Inbox, FileText, Sparkles, Bot, Users, Settings, LogOut,
  Menu, X, Moon, Sun, Search, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { QuickActions } from "@/components/quick-actions";
import { VoiceCommand } from "@/components/voice-command";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "3" },
  { href: "/deals", label: "Deals", icon: FileText },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
  { href: "/team", label: "Team", icon: Users },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <DashboardInner>{children}</DashboardInner>
        <Toaster richColors />
      </ThemeProvider>
    </ClerkProvider>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { userId } = useAuth();

  return (
    <div className="flex h-screen bg-background">
      <aside className={cn(
        "bg-card border-r border-border transition-all duration-300 flex flex-col overflow-hidden hidden lg:flex",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between h-20">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            {sidebarOpen && <span className="font-bold text-lg text-foreground">Clippy</span>}
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && <span className="text-[11px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 space-y-1">
          <Link href="/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Settings</span>}
          </Link>
        </div>
        <div className="border-t border-border p-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search leads, properties, deals... (Cmd+K)"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm">
              <Plus className="w-4 h-4" /><span>Add Lead</span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <MobileNav />
        <QuickActions />
        <VoiceCommand />
      </div>
    </div>
  );
}
