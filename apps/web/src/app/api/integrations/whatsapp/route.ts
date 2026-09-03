import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { WHATSAPP_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
import { isComposioToolkitConfigured } from "@/lib/composio";
import {
  buildWhatsAppAuthorizationUrl,
  getWhatsAppOAuthRedirectUri,
} from "@/lib/whatsapp-oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const requestedMode = req.nextUrl.searchParams.get("mode");
    const useComposio =
      requestedMode === "composio" ||
      (requestedMode !== "direct" && isComposioToolkitConfigured("whatsapp"));
    if (useComposio) {
      if (!isComposioToolkitConfigured("whatsapp")) {
        return NextResponse.redirect(
          new URL("/integrations?error=composio_not_configured", req.url),
        );
      }
      return NextResponse.redirect(
        new URL("/api/integrations/composio/whatsapp", req.url),
      );
    }

    const clientId = process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret =
      process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    const configId = process.env.WHATSAPP_CONFIG_ID?.trim();
    if (!clientId || !clientSecret || !configId) {
      return NextResponse.redirect(
        new URL("/integrations?error=whatsapp_not_configured", req.url),
      );
    }

    const state = randomUUID();
    const redirectUri = getWhatsAppOAuthRedirectUri();
    const authUrl = buildWhatsAppAuthorizationUrl({
      appId: clientId,
      state,
      redirectUri,
      configId,
    });

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set(WHATSAPP_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: redirectUri.startsWith("https://"),
      sameSite: "lax",
      path: "/api/integrations/whatsapp",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("WhatsApp OAuth start failed", error);
    return NextResponse.json(
      { error: "WhatsApp OAuth could not start" },
      { status: 500 },
    );
  }
}
