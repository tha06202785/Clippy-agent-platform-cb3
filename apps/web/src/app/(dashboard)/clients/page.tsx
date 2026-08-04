import { redirect } from "next/navigation";
import {
  ClientDirectory,
  type ClientDirectoryItem,
} from "@/components/client-directory";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const startedAt = Date.now();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,full_name,email,phone,source,stage,priority,ai_score,last_activity_at,created_at,property_enquiries(id)",
    )
    .eq("org_id", membership.org_id)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("Client directory load failed", error.code);
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "Clients page completed",
      route: "/clients",
      duration_ms: Date.now() - startedAt,
      client_count: data?.length || 0,
      vercel_region: process.env.VERCEL_REGION || null,
    }),
  );

  return (
    <ClientDirectory
      clients={(data ?? []) as ClientDirectoryItem[]}
      generatedAt={new Date().toISOString()}
    />
  );
}
