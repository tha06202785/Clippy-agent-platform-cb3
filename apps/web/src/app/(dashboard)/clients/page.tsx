import { redirect } from "next/navigation";
import {
  ClientDirectory,
  type ClientDirectoryItem,
} from "@/components/client-directory";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,full_name,email,phone,source,stage,priority,ai_score,last_activity_at,created_at,property_enquiries(id,status,listing_id,last_activity_at)",
    )
    .eq("org_id", membership.org_id)
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("Client directory load failed", error.code);
  }

  return (
    <ClientDirectory
      clients={(data ?? []) as ClientDirectoryItem[]}
      generatedAt={new Date().toISOString()}
    />
  );
}
