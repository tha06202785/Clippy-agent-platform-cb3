import Link from "next/link";
import { ArrowRight, CircleDashed, type LucideIcon } from "lucide-react";

type AdminFeatureStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  nextStep: string;
};

export function AdminFeatureState({
  title,
  description,
  icon: Icon,
  nextStep,
}: AdminFeatureStateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <section className="rounded-2xl border border-dashed bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">No live data source connected</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This workspace intentionally shows no sample agencies, people, incidents,
          or performance figures. {nextStep}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/admin/control-centre"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Open live operations
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/integrations"
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <CircleDashed className="h-4 w-4" />
            Review connections
          </Link>
        </div>
      </section>
    </div>
  );
}
