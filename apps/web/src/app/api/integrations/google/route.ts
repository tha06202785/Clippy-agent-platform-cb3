import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  getGoogleOAuthRedirectUri,
  GoogleOAuthConfigurationError,
} from "@/lib/google-oauth-config";
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

    const { clientId } = getGoogleOAuthConfig();

    const origin = getAppOrigin();
    const state = randomUUID();
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", getGoogleOAuthRedirectUri());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events",
    );
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
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
    if (error instanceof GoogleOAuthConfigurationError) {
      console.error("Google OAuth configuration is invalid", error.message);
      return NextResponse.json(
        {
          error:
            "Google OAuth is not configured correctly. Check the Google credentials in Vercel.",
          detail: error.message,
        },
        { status: 503 },
      );
    }
    console.error("Google OAuth start failed", error);
    return NextResponse.json(
      { error: "Google OAuth could not start" },
      { status: 500 },
    );
  }
}
