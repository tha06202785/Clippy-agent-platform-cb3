import * as React from "react";
import {
  CircleAlert,
  Inbox,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "./utils";
import { Skeleton } from "./skeleton";

export interface PageStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
}

function PageState({
  action,
  className,
  compact = false,
  description,
  icon: Icon = Inbox,
  title,
  ...props
}: PageStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 text-center",
        compact ? "min-h-48 py-8" : "min-h-[22rem] py-12",
        className,
      )}
      {...props}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: PageStateProps) {
  return <PageState {...props} />;
}

export function ErrorState({
  className,
  icon = CircleAlert,
  ...props
}: PageStateProps) {
  return (
    <PageState
      icon={icon}
      {...props}
      role="alert"
      className={cn("border-destructive/30 bg-destructive/5", className)}
    />
  );
}

export function LoadingState({
  className,
  label = "Loading page",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card/70",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="h-7 w-7 text-primary motion-safe:animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
