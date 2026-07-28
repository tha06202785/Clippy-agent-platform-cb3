"use client";

import { EnterpriseOverview } from "@/components/enterprise-overview";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 md:p-6">
      <EnterpriseOverview />
    </main>
  );
}
