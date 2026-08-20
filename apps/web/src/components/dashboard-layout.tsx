"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import {
  BarChart3,
  Brain,
  BrainCircuit,
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
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { IconButton, PageSkeleton } from "@clippy/ui";
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
  icon: LucideIcon;
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
    href: "/launch",
    label: "Launch Centre",
    icon: Rocket,
    color: "text-emerald-600",
  },
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
    href: "/learning",
    label: "Learning Centre",
    icon: BrainCircuit,
    color: "text-violet-600",
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
  ["/learning", "Learning Centre"],
  ["/analytics", "Performance"],
  ["/integrations", "Connections"],
  ["/automation", "Automation"],
  ["/team", "Team"],
  ["/import", "Import"],
  ["/onboarding", "Setup"],
  ["/launch", "Launch Centre"],
  ["/admin", "Administration"],
  ["/monitoring", "Monitoring"],
];

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousUnread = useRef<number | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
          [],
      );
    const containFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", containFocus);
    window.requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", containFocus);
      mobileMenuButtonRef.current?.focus();
    };
  }, [isDesktop, sidebarOpen]);
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
  const isDark = mounted && resolvedTheme === "dark";
  const sidebarInteractive = isDesktop || sidebarOpen;
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
        tabIndex={sidebarInteractive ? undefined : -1}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
          isActive
            ? "bg-gradient-to-r from-pastel-blue to-pastel-mint text-neutral-800 shadow-soft dark:from-primary/20 dark:to-secondary/20 dark:text-foreground"
            : "text-neutral-600 hover:translate-x-1 hover:bg-neutral-100 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground",
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
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
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
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/85 px-4 backdrop-blur-xl lg:hidden">
        <IconButton
          ref={mobileMenuButtonRef}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="ghost"
          className="-ml-2 rounded-xl"
          aria-label={
            sidebarOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-controls="dashboard-sidebar"
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5 text-foreground" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
          )}
        </IconButton>
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex items-center gap-2"
        >
          <BrandLogo alt="" size={32} priority />
          <span className="text-sm font-semibold tracking-[-0.01em] text-foreground">
            Clippy
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() => void toggleNotifications()}
            variant="ghost"
            className="relative rounded-xl"
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
              <Bell className="h-4 w-4 text-foreground" aria-hidden="true" />
            ) : (
              <BellOff
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {unreadCount > 0 ? (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
                aria-hidden="true"
              />
            ) : null}
          </IconButton>
          <IconButton
            onClick={() => setTheme(isDark ? "light" : "dark")}
            variant="ghost"
            className="rounded-xl"
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-foreground" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-foreground" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* Glass Sidebar */}
      <aside
        ref={sidebarRef}
        id="dashboard-sidebar"
        aria-label="Dashboard navigation"
        aria-hidden={!sidebarInteractive}
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card/90 shadow-soft backdrop-blur-xl transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-64 lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
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
            <span className="text-lg font-semibold tracking-[-0.015em] text-foreground">
              Clippy
            </span>
          </Link>
        </div>

        {/* Nav Items */}
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-4"
          aria-label="Primary"
        >
          {primaryNav.map(renderNavItem)}
          <p className="px-3 pb-1 pt-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-400">
            Workspace
          </p>
          {workspaceNav.map(renderNavItem)}
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={handleLogout}
            tabIndex={sidebarInteractive ? undefined : -1}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all duration-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen pt-14 transition-all duration-300 lg:ml-64 lg:pt-0"
      >
        {/* Top Bar */}
        <header className="sticky top-14 z-30 border-b border-border bg-card/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold leading-8 tracking-[-0.02em] text-foreground sm:text-[26px]">
                {pageTitle}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <IconButton
                onClick={() => void toggleNotifications()}
                variant="ghost"
                className="relative hidden rounded-xl sm:inline-flex"
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
                  <Bell
                    className="h-4 w-4 text-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <BellOff
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                {unreadCount > 0 ? (
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
                    aria-hidden="true"
                  />
                ) : null}
              </IconButton>
              <IconButton
                onClick={() => setTheme(isDark ? "light" : "dark")}
                variant="ghost"
                className="hidden rounded-xl md:inline-flex"
                aria-label={isDark ? "Use light theme" : "Use dark theme"}
              >
                {isDark ? (
                  <Sun className="h-5 w-5 text-foreground" aria-hidden="true" />
                ) : (
                  <Moon
                    className="h-5 w-5 text-foreground"
                    aria-hidden="true"
                  />
                )}
              </IconButton>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-card bg-gradient-to-br from-pastel-blue to-pastel-mint shadow-soft dark:from-primary/20 dark:to-secondary/20"
                aria-hidden="true"
              >
                <UserRound className="h-5 w-5 text-neutral-700 dark:text-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 pb-28 sm:p-6 sm:pb-28 lg:pb-6">{children}</div>
      </main>

      {/* Mobile Nav */}
      <MobileNav />

      {/* Quick Actions FAB */}
      <QuickActions />

      {/* Voice Command */}
      <VoiceCommand />

      {/* Toaster */}
      <Toaster
        richColors
        position="top-right"
        theme={isDark ? "dark" : "light"}
      />
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
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense
            fallback={
              <div className="min-h-screen bg-background p-6">
                <PageSkeleton label="Loading dashboard" />
              </div>
            }
          >
            <DashboardInner>{children}</DashboardInner>
          </Suspense>
        </ThemeProvider>
      </PostHogProvider>
    </QueryProvider>
  );
}
