import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getMicrosoftAuthorizeUrl,
  getMicrosoftOAuthConfig,
  getMicrosoftOAuthRedirectUri,
  MicrosoftOAuthConfigurationError,
} from "@/lib/microsoft-oauth-config";
import { MICROSOFT_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
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
      return NextResponse.json(
        { error: "No organisation found" },
        { status: 400 },
      );
    }

    const { clientId, tenantId } = getMicrosoftOAuthConfig();
    const state = randomUUID();
    const redirectUri = getMicrosoftOAuthRedirectUri();
    const response = NextResponse.redirect(
      getMicrosoftAuthorizeUrl({
        clientId,
        tenantId,
        redirectUri,
        state,
      }),
    );
    response.cookies.set(MICROSOFT_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: redirectUri.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/microsoft",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof MicrosoftOAuthConfigurationError) {
      return NextResponse.json(
        {
          error: "Microsoft 365 OAuth not configured",
          humanMessage:
            "Microsoft 365 is not configured. Please contact support.",
        },
        { status: 503 },
      );
    }
    console.error("Microsoft OAuth start failed", error);
    return NextResponse.json(
      { error: "Microsoft OAuth could not start" },
      { status: 500 },
    );
  }
}
