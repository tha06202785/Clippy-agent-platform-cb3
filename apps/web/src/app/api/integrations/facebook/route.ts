import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase.from("org_members").select("org_id").eq("user_id", user.id).single();
    if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://useclippy.com";
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return NextResponse.json({ error: "Facebook OAuth not configured" }, { status: 500 });

    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", origin + "/api/integrations/facebook/callback");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "pages_messaging,pages_manage_metadata");
    authUrl.searchParams.set("state", orgMember.org_id);

    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
