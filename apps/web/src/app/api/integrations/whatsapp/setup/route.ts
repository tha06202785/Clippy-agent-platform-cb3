import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import { checkComposioWhatsApp } from "@/lib/composio-whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (
    typeof body.phone_number_id !== "string" ||
    !/^\d+$/.test(body.phone_number_id)
  ) {
    return NextResponse.json(
      { error: "Select a business phone number" },
      { status: 400 },
    );
  }
  try {
    const admin = createAdminClient();
    const { data: integration, error } = await admin
      .from("integrations")
      .select("id,settings_json,credentials_encrypted")
      .eq("org_id", membership.org_id)
      .eq("provider", "whatsapp")
      .eq("status", "connected")
      .maybeSingle();
    if (
      error ||
      !integration ||
      integration.settings_json?.connection_mode !== "composio"
    ) {
      return NextResponse.json(
        { error: "Connect WhatsApp before selecting a sender" },
        { status: 400 },
      );
    }
    const credentials = decryptIntegrationCredentials(
      integration.credentials_encrypted,
    );
    const result = await checkComposioWhatsApp({
      admin,
      orgId: membership.org_id,
      integration: {
        id: integration.id,
        connected_account_id: credentials.connected_account_id,
        metadata: integration.settings_json,
      },
      selectedPhoneId: body.phone_number_id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to select the WhatsApp sender",
      },
      { status: 400 },
    );
  }
}
