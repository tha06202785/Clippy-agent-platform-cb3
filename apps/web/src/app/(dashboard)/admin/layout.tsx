"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Shield, DollarSign, Settings, LayoutDashboard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/offices", label: "Offices", icon: Building2 },
  { href: "/admin/agents", label: "Agents", icon: Users },
  { href: "/admin/compliance", label: "Compliance", icon: Shield },
  { href: "/admin/billing", label: "Billing", icon: DollarSign },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <LayoutDashboard className="w-3 h-3" />
        <span>Admin</span>
        {adminNav.find(n => pathname.startsWith(n.href)) && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{adminNav.find(n => pathname.startsWith(n.href))?.label}</span>
          </>
        )}
      </div>
      <nav className="flex gap-1 flex-wrap">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 border-t border-border">
        {children}
      </div>
    </div>
  );
}
