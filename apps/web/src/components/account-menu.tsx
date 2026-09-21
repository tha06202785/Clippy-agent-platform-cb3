"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BarChart3,
  ChevronDown,
  LoaderCircle,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import { canViewTeamActivity } from "@/lib/team-access";
import { cn } from "@/lib/utils";

export type AccountSummary = {
  id: string;
  email: string | null;
  name: string;
  role: string;
  avatarUrl: string | null;
  orgId: string | null;
  agencyName: string | null;
};

export function AccountMenu({
  account,
  compact = false,
  signingOut,
  onSignOut,
}: {
  account: AccountSummary | null;
  compact?: boolean;
  signingOut: boolean;
  onSignOut: () => Promise<void>;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center rounded-xl text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            compact ? "h-10 w-10 justify-center" : "gap-2 px-2 py-1.5",
          )}
          aria-label="Open account menu"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-card bg-gradient-to-br from-pastel-blue to-pastel-mint shadow-soft dark:from-primary/20 dark:to-secondary/20">
            <UserRound
              className="h-5 w-5 text-neutral-700 dark:text-foreground"
              aria-hidden="true"
            />
          </span>
          {!compact ? (
            <>
              <span className="hidden max-w-36 sm:block">
                <span className="block truncate text-sm font-medium text-foreground">
                  {account?.name || "Account"}
                </span>
                <span className="block truncate text-xs capitalize text-muted-foreground">
                  {account?.role || "Loading…"}
                </span>
              </span>
              <ChevronDown
                className="hidden h-4 w-4 text-muted-foreground sm:block"
                aria-hidden="true"
              />
            </>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[80] w-72 rounded-xl border border-border bg-card p-2 text-foreground shadow-xl"
        >
          <DropdownMenu.Label className="px-3 py-2">
            <span className="block truncate text-sm font-semibold">
              {account?.name || "Your account"}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {account?.email || "Loading account details…"}
            </span>
            {account?.agencyName ? (
              <span className="mt-1 block truncate text-xs capitalize text-muted-foreground">
                {account.agencyName} · {account.role}
              </span>
            ) : null}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link
              href="/team"
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-muted focus:bg-muted"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Team and account
            </Link>
          </DropdownMenu.Item>

          {canViewTeamActivity(account?.role) ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/principal"
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Manager dashboard
              </Link>
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={() => void onSignOut()}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 dark:hover:bg-red-950/30 dark:focus:bg-red-950/30"
          >
            {signingOut ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            {signingOut ? "Signing out…" : "Sign out / switch account"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
