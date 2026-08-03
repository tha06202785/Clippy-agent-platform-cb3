export default function DashboardRouteLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span className="sr-only">Loading page…</span>

      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl border border-neutral-200 bg-white/80"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl border border-neutral-200 bg-white/80 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl border border-neutral-200 bg-white/80" />
      </div>
    </div>
  );
}
