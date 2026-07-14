import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code) return NextResponse.redirect(new URL("/integrations?error=no_code", origin));

  try {
    const tokenResponse = await fetch("https://graph.facebook.com/v19.0/oauth/access_token?" + new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || "",
      client_secret: process.env.FACEBOOK_ACCESS_TOKEN || "",
      redirect_uri: origin + "/api/integrations/facebook/callback",
      code,
    }));
    const tokens = await tokenResponse.json();

    const supabase = await createClient();
    await supabase.from("integrations").upsert({
      org_id: state, provider: "facebook", status: "connected",
      credentials_encrypted: JSON.stringify(tokens), connected_at: new Date().toISOString(),
    }, { onConflict: "org_id,provider" });

    return NextResponse.redirect(new URL("/integrations?connected=facebook", origin));
  } catch (error: any) {
    return NextResponse.redirect(new URL("/integrations?error=callback_failed", origin));
  }
}
