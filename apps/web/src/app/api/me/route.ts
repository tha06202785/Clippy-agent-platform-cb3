import { NextResponse } from "next/server";
import {
  CURRENT_USER_PROFILE_FIELDS,
  resolveCurrentUserName,
} from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("user_org_roles")
    .select("org_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) console.error("Membership lookup failed", membershipError);

  const orgId = membership?.org_id ?? null;
  const [profileResult, agentResult, orgResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(CURRENT_USER_PROFILE_FIELDS)
      .eq("user_id", user.id)
      .maybeSingle(),
    orgId
      ? supabase.from("agent_profiles").select("*").eq("user_id", user.id).eq("org_id", orgId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    orgId
      ? supabase.from("orgs").select("id, name").eq("id", orgId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileResult.error) console.error("Profile lookup failed", profileResult.error);
  if (agentResult.error) console.error("Agent profile lookup failed", agentResult.error);
  if (orgResult.error) console.error("Organisation lookup failed", orgResult.error);

  const profile = profileResult.data as Record<string, unknown> | null;
  const agent = agentResult.data as Record<string, unknown> | null;

  const name = resolveCurrentUserName({
    agent,
    profile,
    userMetadata: user.user_metadata,
    email: user.email,
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name,
    role: text(agent?.role) ?? text(profile?.role) ?? membership?.role ?? "agent",
    avatarUrl: text(profile?.avatar_url),
    orgId,
    agencyName: orgResult.data?.name ?? null,
  });
}
