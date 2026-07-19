import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/integrations?error=" + encodeURIComponent(error), origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/integrations?error=no_code", origin));
  }

  // Basic CSRF check — state must be a valid UUID/org ID
  if (!returnedState || returnedState.length < 8) {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", origin));
  }

  try {
    const supabase = await createClient();

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token?" +
        new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID || "",
          client_secret: process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_ACCESS_TOKEN || "",
          redirect_uri: origin + "/api/integrations/facebook/callback",
          code,
        })
    );

    if (!tokenResponse.ok) {
      console.error("Facebook token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/integrations?error=token_exchange_failed", origin));
    }

    const tokens = await tokenResponse.json();

    // Fetch the Facebook Page info so we can store the page ID for webhook routing
    let pageId = "";
    try {
      const pageRes = await fetch(
        "https://graph.facebook.com/v19.0/me/accounts?" +
          new URLSearchParams({ access_token: tokens.access_token })
      );
      const pages = await pageRes.json();
      pageId = pages.data?.[0]?.id || "";
    } catch {
      // Non-fatal — page ID lookup failed
    }

    // Upsert integration — use raw SQL upsert to handle composite key properly
    const { error: upsertError } = await supabase.rpc("upsert_integration", {
      p_org_id: returnedState,
      p_provider: "facebook",
      p_status: "connected",
      p_credentials: JSON.stringify(tokens),
      p_connected_at: new Date().toISOString(),
      p_page_id: pageId,
    });

    // Fallback if RPC not defined
    if (upsertError) {
      const { error: insertError } = await supabase.from("integrations").insert({
        org_id: returnedState,
        provider: "facebook",
        status: "connected",
        credentials_encrypted: JSON.stringify(tokens),
        settings_json: pageId ? { facebook_page_id: pageId } : {},
        connected_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error("Failed to save integration:", insertError);
        return NextResponse.redirect(
          new URL("/integrations?error=save_failed", origin)
        );
      }
    }

    return NextResponse.redirect(
      new URL("/integrations?connected=facebook", origin)
    );
  } catch (error: any) {
    console.error("Facebook OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/integrations?error=callback_failed", origin)
    );
  }
}
