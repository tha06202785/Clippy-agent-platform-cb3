import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { WHATSAPP_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
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
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const clientId =
      process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const origin = getAppOrigin();
    if (!clientId) {
      return NextResponse.json(
        {
          error: "WhatsApp OAuth not configured",
          humanMessage:
            "WhatsApp integration is not configured. Please contact support.",
        },
        { status: 500 },
      );
    }

    const state = randomUUID();
    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set(
      "redirect_uri",
      origin + "/api/integrations/whatsapp/callback",
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "whatsapp_business_management,whatsapp_business_messaging",
    );
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set(WHATSAPP_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: origin.startsWith("https://"),
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
