import { createClient } from "@/lib/supabase/server";
import { getGoogleOAuthConfig } from "@/lib/google-oauth-config";

// Auto-refresh expired OAuth tokens
export async function refreshExpiredTokens(orgId: string, userId: string) {
  const supabase = await createClient();

  // Get all expired integrations with refresh tokens
  const { data: expired } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", orgId)
    .lt("expires_at", new Date().toISOString())
    .not("refresh_token", "is", null);

  if (!expired || expired.length === 0) return { refreshed: 0 };

  let refreshed = 0;
  const results = [];

  for (const integration of expired) {
    try {
      let newToken = null;

      // Refresh based on provider
      if (
        integration.provider === "gmail" ||
        integration.provider === "google"
      ) {
        newToken = await refreshGoogleToken(integration.refresh_token);
      } else if (
        integration.provider === "facebook" ||
        integration.provider === "whatsapp"
      ) {
        // Facebook/WhatsApp tokens are long-lived (60 days), usually don't need refresh
        continue;
      }

      if (newToken) {
        await supabase
          .from("integrations")
          .update({
            access_token: newToken.access_token,
            expires_at: newToken.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("provider", integration.provider);

        refreshed++;
        results.push({ provider: integration.provider, success: true });
      }
    } catch (error: any) {
      console.error("Failed to refresh token for", integration.provider, error);
      results.push({
        provider: integration.provider,
        success: false,
        error: error.message,
      });
    }
  }

  return { refreshed, results };
}

async function refreshGoogleToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Google token refresh failed");
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_at: new Date(
      Date.now() + (data.expires_in || 3600) * 1000,
    ).toISOString(),
  };
}
