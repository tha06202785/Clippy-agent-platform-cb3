import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/integrations/whatsapp/callback - Handle WhatsApp OAuth callback
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      return NextResponse.redirect(new URL("/integrations?error=" + error, req.url));
    }

    if (!code || !state) {
      return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
    }

    const orgId = state;

    // Exchange code for access token
    const clientId = process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://useclippy.com";

    const tokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token";
    const tokenResponse = await fetch(tokenUrl + "?" + new URLSearchParams({
      client_id: clientId || "",
      client_secret: clientSecret || "",
      redirect_uri: origin + "/api/integrations/whatsapp/callback",
      code: code,
    }));

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get long-lived token
    const longLivedTokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token";
    const longLivedResponse = await fetch(longLivedTokenUrl + "?" + new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId || "",
      client_secret: clientSecret || "",
      fb_exchange_token: accessToken,
    }));

    const longLivedData = await longLivedResponse.json();
    const longLivedToken = longLivedData.access_token;

    // Get WhatsApp Business Account info
    const meUrl = "https://graph.facebook.com/v18.0/me";
    const meResponse = await fetch(meUrl + "?" + new URLSearchParams({
      fields: "whatsapp_business_accounts{id,name,phone_numbers{id,phone_number,verified_name,status}}",
      access_token: longLivedToken,
    }));

    const meData = await meResponse.json();
    const waAccounts = meData.whatsapp_business_accounts || { data: [] };

    // Save integration
    const { data: existing } = await supabase
      .from("integrations")
      .select("*")
      .eq("org_id", orgId)
      .eq("provider", "whatsapp")
      .single();

    let integrationData;
    if (existing) {
      const { data } = await supabase
        .from("integrations")
        .update({
          access_token: longLivedToken,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: waAccounts,
          status: "connected",
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .eq("provider", "whatsapp")
        .select()
        .single();
      integrationData = data;
    } else {
      const { data } = await supabase
        .from("integrations")
        .insert({
          org_id: orgId,
          user_id: user.id,
          provider: "whatsapp",
          access_token: longLivedToken,
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: waAccounts,
          status: "connected",
        })
        .select()
        .single();
      integrationData = data;
    }

    // Update health status
    await supabase.from("integration_health").upsert({
      org_id: orgId,
      provider: "whatsapp",
      status: "healthy",
      last_sync_at: new Date().toISOString(),
      items_indexed: 0,
      activity_summary: {
        connectedAt: new Date().toISOString(),
        accountsConnected: waAccounts.data?.length || 0,
      },
    });

    // Log activity
    await supabase.from("clippy_activity_log").insert({
      org_id: orgId,
      user_id: user.id,
      action: "integration_connected",
      category: "integration",
      title: "WhatsApp Cloud API connected",
      description: "WhatsApp Business API integration completed",
      metadata: { provider: "whatsapp", accounts: waAccounts.data?.length || 0 },
      impact_summary: "Can now send WhatsApp messages to leads",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL("/integrations?success=whatsapp", req.url));
  } catch (error: any) {
    console.error("WhatsApp OAuth error:", error);
    return NextResponse.redirect(new URL("/integrations?error=whatsapp_failed", req.url));
  }
}
