import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["owner", "admin"] as const;

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" as const };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("user_org_roles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .in("role", [...ADMIN_ROLES])
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.org_id) {
    return { status: "forbidden" as const };
  }

  return {
    status: "authorized" as const,
    supabase,
    user,
    membership,
  };
}
