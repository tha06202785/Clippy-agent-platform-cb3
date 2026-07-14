"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, FileText, Bot, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "#", label: "Add", icon: Plus, isAction: true },
  { href: "/deals", label: "Deals", icon: FileText },
  { href: "/copilot", label: "AI", icon: Bot },
];

export function MobileNav({ onAddLead }: { onAddLead?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          if (item.isAction) {
            return (
              <button key={item.label} onClick={() => { if (onAddLead) onAddLead(); }}
                className="flex flex-col items-center gap-0.5 -mt-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-medium text-primary">{item.label}</span>
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
