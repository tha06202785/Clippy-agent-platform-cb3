import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code) return NextResponse.redirect(new URL("/integrations?error=no_code", origin));

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: origin + "/api/integrations/google/callback",
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", origin));
    tokens.expires_at = Date.now() + (tokens.expires_in || 3600) * 1000;

    const supabase = await createClient();
    await supabase.from("integrations").upsert({
      org_id: state, provider: "gmail", status: "connected",
      credentials_encrypted: JSON.stringify(tokens), connected_at: new Date().toISOString(),
    }, { onConflict: "org_id,provider" });

    return NextResponse.redirect(new URL("/integrations?connected=gmail", origin));
  } catch (error: any) {
    return NextResponse.redirect(new URL("/integrations?error=callback_failed", origin));
  }
}
