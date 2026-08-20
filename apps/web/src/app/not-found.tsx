import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState, buttonVariants, cn } from "@clippy/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-2xl">
        <EmptyState
          icon={SearchX}
          title="We could not find that page"
          description="The link may be old, or the page may have moved. Return to Clippy Today to keep working."
          action={
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Return to Today
            </Link>
          }
        />
      </div>
    </main>
  );
}
