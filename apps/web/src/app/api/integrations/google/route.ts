import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.json({ error: "No org found" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 },
      );
    }

    const origin = getAppOrigin();
    const state = randomUUID();
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set(
      "redirect_uri",
      origin + "/api/integrations/google/callback",
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events",
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/google",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("Google OAuth start failed", error);
    return NextResponse.json(
      { error: "Google OAuth could not start" },
      { status: 500 },
    );
  }
}
