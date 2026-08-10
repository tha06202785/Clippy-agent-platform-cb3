"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import {
  BarChart3,
  Brain,
  Inbox,
  FileText,
  Bot,
  Users,
  Settings,
  LogOut,
  Calendar,
  Menu,
  X,
  Moon,
  Sun,
  Home,
  Building2,
  Plug,
  UserRound,
  ShieldCheck,
  LoaderCircle,
  Bell,
  BellOff,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { QuickActions } from "@/components/quick-actions";
import { VoiceCommand } from "@/components/voice-command";
import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogPageView } from "@/components/posthog-pageview";
import { QueryProvider } from "@/components/query-provider";
import { BrandLogo } from "@/components/brand-logo";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  color?: string;
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: Home, color: "text-emerald-500" },
  {
    href: "/calendar",
    label: "Calendar",
    icon: Calendar,
    color: "text-indigo-500",
  },
  {
    href: "/inbox",
    label: "Conversations",
    icon: Inbox,
    color: "text-blue-500",
  },
  {
    href: "/clients",
    label: "Clients",
    icon: UserRound,
    color: "text-cyan-600",
  },
  {
    href: "/deals",
    label: "Opportunities",
    icon: FileText,
    color: "text-orange-500",
  },
  {
    href: "/inspections",
    label: "Properties",
    icon: Building2,
    color: "text-purple-500",
  },
  { href: "/copilot", label: "Clippy", icon: Bot, color: "text-purple-500" },
];

const workspaceNav: NavItem[] = [
  {
    href: "/briefing",
    label: "Daily brief",
    icon: Calendar,
    color: "text-yellow-500",
  },
  {
    href: "/knowledge",
    label: "Agency brain",
    icon: Brain,
    color: "text-emerald-500",
  },
  {
    href: "/analytics",
    label: "Performance",
    icon: BarChart3,
    color: "text-pink-500",
  },
  {
    href: "/integrations",
    label: "Connections",
    icon: Plug,
    color: "text-blue-500",
  },
  {
    href: "/automation",
    label: "Automation",
    icon: Workflow,
    color: "text-purple-600",
  },
  { href: "/team", label: "Team", icon: Users, color: "text-blue-500" },
  {
    href: "/admin",
    label: "Admin Console",
    icon: ShieldCheck,
    color: "text-indigo-500",
  },
];

const pageTitles: Array<[string, string]> = [
  ["/dashboard", "Today"],
  ["/calendar", "Calendar"],
  ["/inbox", "Conversations"],
  ["/clients", "Clients"],
  ["/deals", "Opportunities"],
  ["/inspections", "Properties"],
  ["/copilot", "Clippy"],
  ["/briefing", "Daily brief"],
  ["/knowledge", "Agency brain"],
  ["/analytics", "Performance"],
  ["/integrations", "Connections"],
  ["/automation", "Automation"],
  ["/team", "Team"],
  ["/import", "Import"],
  ["/onboarding", "Setup"],
  ["/admin", "Administration"],
  ["/monitoring", "Monitoring"],
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousUnread = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const muted =
      window.localStorage.getItem("clippy:notifications-muted") === "true";
    setNotificationsEnabled(
      "Notification" in window &&
        Notification.permission === "granted" &&
        !muted,
    );
  }, []);
  useEffect(() => setPendingHref(null), [pathname]);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations/unread", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await response.json();
      const nextCount = typeof data.count === "number" ? data.count : 0;
      if (
        previousUnread.current !== null &&
        nextCount > previousUnread.current &&
        notificationsEnabled &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        pathname !== "/inbox"
      ) {
        const notification = new Notification("New Clippy conversation", {
          body: data.latest?.text || "A client sent a new message.",
          icon: "/icon.png",
          tag: data.latest?.conversation_id || "clippy-inbox",
        });
        notification.onclick = () => {
          window.focus();
          router.push("/inbox");
          notification.close();
        };
      }
      previousUnread.current = nextCount;
      setUnreadCount(nextCount);
    } catch {
      // Keep the last known badge when a background refresh fails.
    }
  }, [notificationsEnabled, pathname, router]);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    if (notificationsEnabled) {
      window.localStorage.setItem("clippy:notifications-muted", "true");
      setNotificationsEnabled(false);
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    window.localStorage.setItem(
      "clippy:notifications-muted",
      enabled ? "false" : "true",
    );
    setNotificationsEnabled(enabled);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  };

  const pageTitle =
    pageTitles.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )?.[1] ?? "Clippy";
  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
    const isPending = pendingHref === item.href && !isActive;
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={() => {
          setSidebarOpen(false);
          if (!isActive) setPendingHref(item.href);
        }}
        aria-current={isActive ? "page" : undefined}
        aria-busy={isPending || undefined}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
          isActive
            ? "bg-gradient-to-r from-pastel-blue to-pastel-mint text-neutral-800 shadow-soft"
            : "text-neutral-600 hover:bg-neutral-100 hover:translate-x-1",
        )}
      >
        {isPending ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <item.icon
            className={cn(
              "h-5 w-5",
              isActive ? "text-primary" : item.color || "text-neutral-400",
              "transition-transform group-hover:scale-110",
            )}
          />
        )}
        <span className="text-sm font-medium">{item.label}</span>
        {item.href === "/inbox" && unreadCount > 0 ? (
          <span
            className="ml-auto min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
            aria-label={`${unreadCount} unread conversations`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-hero",
        `${GeistSans.variable} ${GeistMono.variable} ${GeistSans.className}`,
      )}
    >
      {pendingHref ? (
        <div
          className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-primary/15"
          role="progressbar"
          aria-label="Loading page"
        >
          <div className="h-full w-2/3 animate-pulse rounded-r-full bg-gradient-to-r from-primary via-secondary to-primary" />
        </div>
      ) : null}
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-xl border-b border-neutral-200">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors"
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-neutral-800" />
          ) : (
            <Menu className="w-5 h-5 text-neutral-800" />
          )}
        </button>
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex items-center gap-2"
        >
          <BrandLogo alt="" size={32} priority />
          <span className="text-sm font-semibold tracking-[-0.01em] text-neutral-800">
            Clippy
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void toggleNotifications()}
            className="relative rounded-xl p-2 hover:bg-neutral-100 transition-colors"
            aria-label={
              notificationsEnabled
                ? "Mute conversation notifications"
                : "Enable conversation notifications"
            }
            title={
              notificationsEnabled
                ? "Conversation notifications are on"
                : "Enable conversation notifications"
            }
          >
            {notificationsEnabled ? (
              <Bell className="h-4 w-4 text-neutral-800" />
            ) : (
              <BellOff className="h-4 w-4 text-neutral-500" />
            )}
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            ) : null}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            {mounted && theme === "dark" ? (
              <Sun className="w-4 h-4 text-neutral-800" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-800" />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Glass Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-white/90 backdrop-blur-xl border-r border-neutral-200 flex flex-col transition-transform duration-300 ease-in-out shadow-soft",
          sidebarOpen ? "translate-x-0" : "-translate-x-64 lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-200">
          <Link
            href="/dashboard"
            prefetch={false}
            className="flex items-center gap-3 group"
          >
            <BrandLogo
              alt=""
              size={36}
              priority
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-lg font-semibold tracking-[-0.015em] text-neutral-800">
              Clippy
            </span>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {primaryNav.map(renderNavItem)}
          <p className="px-3 pb-1 pt-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-400">
            Workspace
          </p>
          {workspaceNav.map(renderNavItem)}
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
      <main className="min-h-screen transition-all duration-300 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.02em] text-neutral-800">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => void toggleNotifications()}
                className="relative rounded-xl p-2 hover:bg-neutral-100 transition-colors"
                aria-label={
                  notificationsEnabled
                    ? "Mute conversation notifications"
                    : "Enable conversation notifications"
                }
                title={
                  notificationsEnabled
                    ? "Conversation notifications are on"
                    : "Enable conversation notifications"
                }
              >
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-neutral-800" />
                ) : (
                  <BellOff className="h-4 w-4 text-neutral-500" />
                )}
                {unreadCount > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                ) : null}
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl hover:bg-neutral-100 transition-colors hidden md:block"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-5 h-5 text-neutral-800" />
                ) : (
                  <Moon className="w-5 h-5 text-neutral-800" />
                )}
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-mint flex items-center justify-center border-2 border-white shadow-soft">
                <UserRound className="h-5 w-5 text-neutral-700" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <PostHogProvider>
        <PostHogPageView />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <DashboardInner>{children}</DashboardInner>
        </ThemeProvider>
      </PostHogProvider>
    </QueryProvider>
  );
}
