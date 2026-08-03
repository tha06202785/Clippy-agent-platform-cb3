import { NextRequest, NextResponse } from "next/server";
import { decryptIntegrationCredentials } from "@/lib/integration-credentials";
import { buildMetaObjectUrl } from "@/lib/facebook-oauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/integrations/test/:provider - Test integration connection
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!orgMember) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    const orgId = orgMember.org_id;
    const { provider } = await context.params;

    // Credentials are available only to this authenticated server route.
    const admin = createAdminClient();
    const { data: storedIntegration } = await admin
      .from("integrations")
      .select(
        "id,org_id,provider,status,credentials_encrypted,settings_json,connected_at,created_at,updated_at",
      )
      .eq("org_id", orgId)
      .eq("provider", provider)
      .maybeSingle();

    if (!storedIntegration) {
      return NextResponse.json({
        success: false,
        provider,
        status: "not_connected",
        message: "Integration not connected",
        action: "connect",
        actionUrl: "/api/integrations/" + provider,
      });
    }

    let credentials: Record<string, unknown> = {};
    if (storedIntegration.credentials_encrypted) {
      try {
        credentials = decryptIntegrationCredentials(
          storedIntegration.credentials_encrypted,
        );
      } catch (error) {
        console.error("Integration credential decryption failed", provider);
        return NextResponse.json({
          success: false,
          provider,
          status: "credential_error",
          message: "Stored credentials could not be decrypted",
          action: "reconnect",
          humanMessage: "This connection must be reconnected securely.",
        });
      }
    }

    const settings =
      storedIntegration.settings_json &&
      typeof storedIntegration.settings_json === "object" &&
      !Array.isArray(storedIntegration.settings_json)
        ? storedIntegration.settings_json
        : {};
    const integration = {
      ...storedIntegration,
      ...credentials,
      metadata: settings,
    };

    // Test based on provider
    let testResult: any = {
      success: false,
      provider,
      status: "unknown",
      message: "",
      permissions: [],
      lastSync: integration.updated_at,
    };

    switch (provider) {
      case "gmail":
      case "google":
        testResult = await testGoogleConnection(supabase, integration, orgId);
        break;
      case "google-calendar":
        testResult = await testGoogleCalendarConnection(
          supabase,
          integration,
          orgId,
        );
        break;
      case "facebook":
        testResult = await testFacebookConnection(supabase, integration, orgId);
        break;
      case "instagram":
        testResult = await testInstagramConnection(integration);
        break;
      case "whatsapp":
        testResult = await testWhatsAppConnection(supabase, integration, orgId);
        break;
      default:
        testResult = {
          success: integration.status === "connected",
          provider,
          status: integration.status,
          message:
            integration.status === "connected" ? "Connected" : "Disconnected",
        };
    }

    // Update health status
    await admin.from("integration_health").upsert({
      org_id: orgId,
      provider,
      status: testResult.success ? "healthy" : "error",
      last_sync_at: new Date().toISOString(),
      items_indexed: testResult.itemsIndexed || 0,
      activity_summary: {
        lastTest: new Date().toISOString(),
        testResult: testResult.success ? "passed" : "failed",
        errorMessage: testResult.message || null,
      },
    });

    return NextResponse.json(testResult);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        provider: (await context.params).provider,
        status: "error",
        message: "Connection test failed: " + error.message,
        errorType: "test_error",
      },
      { status: 500 },
    );
  }
}

async function testInstagramConnection(integration: any) {
  const instagramId = integration.metadata?.instagram_business_account_id;
  if (!integration.access_token || !instagramId) {
    return {
      success: false,
      provider: "instagram",
      status: "not_connected",
      message: "Instagram business account not configured",
      action: "connect",
      actionUrl: "/api/integrations/facebook?connect=instagram",
      humanMessage:
        "Connect a Facebook Page that has an Instagram professional account linked to it.",
    };
  }

  try {
    const response = await fetch(
      buildMetaObjectUrl(
        instagramId,
        "id,username,name,profile_picture_url",
        integration.access_token,
      ),
      { cache: "no-store" },
    );
    if (!response.ok) {
      return {
        success: false,
        provider: "instagram",
        status: "error",
        message: "Instagram access could not be verified",
        action: "reconnect",
        actionUrl: "/api/integrations/facebook?connect=instagram",
        humanMessage: "Instagram needs to be reconnected through Meta.",
      };
    }
    const account = await response.json();
    return {
      success: true,
      provider: "instagram",
      status: "healthy",
      message: "Instagram connected",
      humanMessage: account.username
        ? `Instagram @${account.username} is ready to receive enquiries.`
        : "Instagram is ready to receive enquiries.",
      itemsIndexed: integration.items_indexed || 0,
    };
  } catch {
    return {
      success: false,
      provider: "instagram",
      status: "error",
      message: "Instagram connection test failed",
      humanMessage: "Unable to verify Instagram right now.",
    };
  }
}

async function testGoogleConnection(
  supabase: any,
  integration: any,
  orgId: string,
) {
  try {
    if (!integration.access_token) {
      return {
        success: false,
        provider: "gmail",
        status: "token_missing",
        message: "Missing access token",
        action: "reconnect",
        actionUrl: "/api/integrations/google",
        errorType: "auth_error",
        humanMessage:
          "Your Gmail connection needs to be refreshed. Click Reconnect to sign in again.",
      };
    }

    const expiresAt = integration.expires_at
      ? new Date(integration.expires_at)
      : null;
    if (expiresAt && expiresAt < new Date()) {
      if (integration.refresh_token) {
        return {
          success: false,
          provider: "gmail",
          status: "token_expired",
          message: "Access token expired",
          action: "refresh",
          canAutoRefresh: true,
          errorType: "token_expired",
          humanMessage:
            "Your Gmail session expired. We can refresh it automatically or you can reconnect.",
        };
      } else {
        return {
          success: false,
          provider: "gmail",
          status: "token_expired",
          message: "Access token expired and no refresh token",
          action: "reconnect",
          actionUrl: "/api/integrations/google",
          errorType: "auth_error",
          humanMessage:
            "Your Gmail connection expired. Please reconnect to continue.",
        };
      }
    }

    const scopes = integration.scope?.split(" ") || [];
    const requiredScopes = ["https://www.googleapis.com/auth/gmail.modify"];

    const missingScopes = requiredScopes.filter(
      (s: string) => !scopes.includes(s),
    );
    if (missingScopes.length > 0) {
      return {
        success: false,
        provider: "gmail",
        status: "missing_permissions",
        message: "Missing required permissions",
        missingScopes,
        action: "reconnect",
        actionUrl: "/api/integrations/google",
        errorType: "permission_error",
        humanMessage:
          "Clippy needs permission to read your Gmail. Please reconnect and grant all permissions.",
        permissions: {
          granted: scopes.length,
          required: requiredScopes.length,
          missing: missingScopes,
        },
      };
    }

    return {
      success: true,
      provider: "gmail",
      status: "healthy",
      message: "Gmail connected successfully",
      humanMessage: "Gmail is connected and working perfectly!",
      email: integration.email || "Connected",
      permissions: { granted: scopes.length, allRequired: true },
      itemsIndexed: integration.items_indexed || 0,
      lastSync: integration.updated_at,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "gmail",
      status: "connection_error",
      message: error.message,
      errorType: "api_error",
      humanMessage:
        "Unable to connect to Gmail. Please check your internet connection and try again.",
    };
  }
}

async function testGoogleCalendarConnection(
  supabase: any,
  integration: any,
  orgId: string,
) {
  try {
    if (!integration.access_token) {
      return {
        success: false,
        provider: "google-calendar",
        status: "not_connected",
        message: "Calendar not connected",
        action: "connect",
        actionUrl: "/api/integrations/google",
        humanMessage:
          "Connect your Google Calendar to schedule inspections automatically.",
      };
    }

    const scopes = integration.scope?.split(" ") || [];
    const hasCalendarScope = scopes.some((s: string) => s.includes("calendar"));

    if (!hasCalendarScope) {
      return {
        success: false,
        provider: "google-calendar",
        status: "missing_permissions",
        message: "Missing calendar permissions",
        action: "reconnect",
        actionUrl: "/api/integrations/google",
        errorType: "permission_error",
        humanMessage:
          "Clippy needs calendar access to schedule inspections. Please reconnect.",
      };
    }

    return {
      success: true,
      provider: "google-calendar",
      status: "healthy",
      message: "Calendar connected",
      humanMessage:
        "Google Calendar is connected and ready to schedule inspections!",
      itemsIndexed: integration.items_indexed || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "google-calendar",
      status: "error",
      message: error.message,
      humanMessage: "Unable to verify calendar connection.",
    };
  }
}

async function testFacebookConnection(
  supabase: any,
  integration: any,
  orgId: string,
) {
  try {
    if (!integration.access_token) {
      return {
        success: false,
        provider: "facebook",
        status: "not_connected",
        message: "Facebook not connected",
        action: "connect",
        actionUrl: "/api/integrations/facebook",
        humanMessage:
          "Connect Facebook to import leads from Messenger and Ads.",
      };
    }

    const connectedPages = integration.metadata?.pages || [];

    return {
      success: true,
      provider: "facebook",
      status: "healthy",
      message: "Facebook connected",
      humanMessage:
        connectedPages.length > 0
          ? "Facebook connected with " + connectedPages.length + " page(s)"
          : "Facebook is connected!",
      pages: connectedPages,
      itemsIndexed: integration.items_indexed || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "facebook",
      status: "error",
      message: error.message,
      humanMessage: "Unable to verify Facebook connection.",
    };
  }
}

async function testWhatsAppConnection(
  supabase: any,
  integration: any,
  orgId: string,
) {
  try {
    const phoneNumberId =
      integration.metadata?.whatsapp_phone_number_id ||
      integration.metadata?.phone_number_id;
    if (!integration.access_token || !phoneNumberId) {
      return {
        success: false,
        provider: "whatsapp",
        status: "not_connected",
        message: "WhatsApp not configured",
        action: "connect",
        actionUrl: "/api/integrations/whatsapp",
        humanMessage:
          "Connect WhatsApp Cloud API to message leads automatically.",
      };
    }

    const response = await fetch(
      buildMetaObjectUrl(
        phoneNumberId,
        "id,display_phone_number,verified_name,code_verification_status,quality_rating",
        integration.access_token,
      ),
      { cache: "no-store" },
    );
    if (!response.ok) {
      return {
        success: false,
        provider: "whatsapp",
        status: "error",
        message: "WhatsApp access could not be verified",
        action: "reconnect",
        actionUrl: "/api/integrations/whatsapp",
        humanMessage: "WhatsApp needs to be reconnected through Meta Business.",
      };
    }
    const phone = await response.json();

    return {
      success: true,
      provider: "whatsapp",
      status: "healthy",
      message: "WhatsApp Cloud API connected",
      humanMessage: phone.display_phone_number
        ? `WhatsApp ${phone.display_phone_number} is ready to send messages.`
        : "WhatsApp is ready to send messages!",
      phoneNumber: phoneNumberId,
      itemsIndexed: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      provider: "whatsapp",
      status: "error",
      message: error.message,
      humanMessage: "Unable to verify WhatsApp connection.",
    };
  }
}
