import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FACEBOOK_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";\nimport { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!orgMember) return NextResponse.json({ error: "No org found" }, { status: 400 });

    const origin = getAppOrigin();
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return NextResponse.json({ error: "Facebook OAuth not configured" }, { status: 500 });

    const state = randomUUID();
    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", origin + "/api/integrations/facebook/callback");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "pages_messaging,pages_manage_metadata");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/facebook",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("Facebook OAuth start failed", error);
    return NextResponse.json({ error: "Facebook OAuth could not start" }, { status: 500 });
  }
}
