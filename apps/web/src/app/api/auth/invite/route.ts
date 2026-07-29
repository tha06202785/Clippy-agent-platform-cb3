import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/app-origin";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["agent", "manager", "admin"]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "";
    if (!/^\S+@\S+\.\S+$/.test(email) || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "A valid email and role are required" }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles").select("org_id,role").eq("user_id", user.id).limit(1).maybeSingle();
    if (membershipError || !membership) {
      return NextResponse.json({ error: "No organisation found" }, { status: 400 });
    }
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: getAppOrigin() + "/dashboard",
      data: { invited_org_id: membership.org_id },
    });
    if (inviteError || !invited.user) {
      const status = inviteError?.message?.toLowerCase().includes("already") ? 409 : 400;
      return NextResponse.json({ error: inviteError?.message || "Invite could not be sent" }, { status });
    }

    const { error: roleError } = await admin.from("user_org_roles").insert({
      org_id: membership.org_id, user_id: invited.user.id, role,
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      console.error("Invite membership failed", roleError.code);
      return NextResponse.json({ error: "Invite could not be completed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: { user_id: invited.user.id, email, role, status: "invited", created_at: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    console.error("Team invite failed", error);
    return NextResponse.json({ error: "Invite could not be sent" }, { status: 500 });
  }
}
