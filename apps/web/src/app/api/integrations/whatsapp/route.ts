import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/integrations/whatsapp - Start WhatsApp OAuth flow
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // WhatsApp Cloud API uses Meta Business Login
    // Redirect to Meta OAuth
    const clientId = process.env.WHATSAPP_APP_ID || process.env.FACEBOOK_APP_ID;
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://useclippy.com";
    
    if (!clientId) {
      return NextResponse.json({ 
        error: "WhatsApp OAuth not configured",
        humanMessage: "WhatsApp integration is not configured. Please contact support.",
      }, { status: 500 });
    }

    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", origin + "/api/integrations/whatsapp/callback");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "whatsapp_business_management,whatsapp_business_messaging");
    authUrl.searchParams.set("state", orgMember.org_id);

    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
