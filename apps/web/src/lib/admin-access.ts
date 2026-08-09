import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_ROLES = ["owner", "admin"] as const;

function parseAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminIdentity(
  user: { id: string; email?: string | null },
  env: Record<string, string | undefined> = process.env,
): boolean {
  const userIds = parseAllowlist(env.PLATFORM_ADMIN_USER_IDS);
  const emails = parseAllowlist(env.PLATFORM_ADMIN_EMAILS);

  return (
    userIds.has(user.id.toLowerCase()) ||
    Boolean(user.email && emails.has(user.email.toLowerCase()))
  );
}

export async function getAdminContext() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { status: "unavailable" as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" as const };
  }

  const isPlatformAdmin = isPlatformAdminIdentity(user);
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
    isPlatformAdmin,
  };
}

export async function getPlatformAdminContext() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { status: "unavailable" as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { status: "unauthenticated" as const };
  if (!isPlatformAdminIdentity(user)) return { status: "forbidden" as const };

  try {
    return {
      status: "authorized" as const,
      user,
      admin: createAdminClient(),
    };
  } catch {
    return { status: "unavailable" as const };
  }
}
