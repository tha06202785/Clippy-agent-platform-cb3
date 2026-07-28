import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldX } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { getAdminContext } from "@/lib/admin-access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAdminContext();

  if (context.status === "unauthenticated") {
    redirect("/sign-in?next=%2Fadmin%2Fcontrol-centre");
  }

  if (context.status === "forbidden") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <ShieldX className="h-6 w-6 text-amber-700" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This area is limited to organisation Owners and Admins. Your signed-in
          account has not been granted either role.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Return to Today
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNav />
      <div className="border-t border-border pt-4">{children}</div>
    </div>
  );
}
