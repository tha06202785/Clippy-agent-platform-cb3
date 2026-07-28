"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin/control-centre", label: "Operations", icon: Activity },
  { href: "/admin/qa", label: "Diagnostics", icon: ShieldCheck },
  { href: "/admin/agents", label: "Team access", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const activeItem = adminNav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <LayoutDashboard className="h-3 w-3" />
        <span>Admin</span>
        {activeItem && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">{activeItem.label}</span>
          </>
        )}
      </div>
      <nav aria-label="Admin" className="flex flex-wrap gap-1">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
