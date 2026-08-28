import { NextRequest, NextResponse } from "next/server";
import {
  buildFacebookPageAccountsUrl,
  buildFacebookPageSubscriptionUrl,
  buildFacebookTokenUrl,
  getFacebookOAuthRedirectUri,
  getSafeFacebookErrorDetails,
  parseMetaPageConnections,
} from "@/lib/facebook-oauth";
import {
  FACEBOOK_OAUTH_STATE_COOKIE,
  matchesOAuthState,
} from "@/lib/oauth-state";
import { encryptIntegrationCredentials } from "@/lib/integration-credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

function redirectAndClearState(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/integrations/facebook",
    maxAge: 0,
  });
  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const providerError = searchParams.get("error");
  const expectedState = req.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;

  if (providerError) {
    return redirectAndClearState(
      new URL(
        "/integrations?error=" + encodeURIComponent(providerError),
        origin,
      ),
    );
  }

  if (!code) {
    return redirectAndClearState(
      new URL("/integrations?error=no_code", origin),
    );
  }

  if (!matchesOAuthState(expectedState, returnedState)) {
    return redirectAndClearState(
      new URL("/integrations?error=invalid_state", origin),
    );
  }

  const requestedProvider = returnedState?.startsWith("instagram.")
    ? "instagram"
    : "facebook";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return redirectAndClearState(
        new URL("/sign-in?next=/integrations", origin),
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership?.org_id) {
      return redirectAndClearState(
        new URL("/integrations?error=no_org", origin),
      );
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      return redirectAndClearState(
        new URL("/integrations?error=not_configured", origin),
      );
    }

    const redirectUri = getFacebookOAuthRedirectUri();
    const tokenResponse = await fetch(
      buildFacebookTokenUrl({
        appId,
        appSecret,
        code,
        redirectUri,
      }),
    );

    if (!tokenResponse.ok) {
      const failurePayload = await tokenResponse.json().catch(() => null);
      console.error("Facebook token exchange failed", {
        status: tokenResponse.status,
        ...getSafeFacebookErrorDetails(failurePayload),
      });
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    const tokens = (await tokenResponse.json()) as FacebookTokenResponse;
    if (!tokens.access_token) {
      console.error("Facebook token exchange returned no access token");
      return redirectAndClearState(
        new URL("/integrations?error=token_exchange_failed", origin),
      );
    }

    let pageConnections: ReturnType<typeof parseMetaPageConnections> = [];
    try {
      const pageResponse = await fetch(
        buildFacebookPageAccountsUrl(tokens.access_token),
      );
      if (pageResponse.ok) {
        pageConnections = parseMetaPageConnections(await pageResponse.json());
      } else {
        const failurePayload = await pageResponse.json().catch(() => null);
        console.warn("Facebook Page discovery failed", {
          status: pageResponse.status,
          ...getSafeFacebookErrorDetails(failurePayload),
        });
      }
    } catch {
      // Page discovery is optional; credential persistence remains valid.
    }

    const connectedAt = new Date().toISOString();
    const subscriptionResults = await Promise.all(
      pageConnections.map(async (page) => {
        if (!page.accessToken) return { pageId: page.id, subscribed: false };
        try {
          const response = await fetch(
            buildFacebookPageSubscriptionUrl(page.id, page.accessToken),
            { method: "POST" },
          );
          if (!response.ok) {
            const failurePayload = await response.json().catch(() => null);
            console.warn("Facebook Page subscription failed", {
              pageId: page.id,
              status: response.status,
              ...getSafeFacebookErrorDetails(failurePayload),
            });
          }
          return { pageId: page.id, subscribed: response.ok };
        } catch {
          console.warn("Facebook Page subscription request failed", {
            pageId: page.id,
          });
          return { pageId: page.id, subscribed: false };
        }
      }),
    );
    const subscribedPageIds = subscriptionResults
      .filter((result) => result.subscribed)
      .map((result) => result.pageId);
    const instagramPage = pageConnections.find((page) => page.instagram);
    const safePages = pageConnections.map((page) => ({
      id: page.id,
      name: page.name,
    }));
    const facebookCredentials = {
      ...tokens,
      pages: pageConnections.map((page) => ({
        id: page.id,
        access_token: page.accessToken,
      })),
    };
    const integrationRows = [
      {
        org_id: membership.org_id,
        provider: "facebook",
        status: "connected",
        credentials_encrypted:
          encryptIntegrationCredentials(facebookCredentials),
        settings_json: {
          facebook_page_id: pageConnections[0]?.id,
          pages: safePages,
        },
        connected_at: connectedAt,
        updated_at: connectedAt,
      },
      ...(instagramPage?.instagram
        ? [
            {
              org_id: membership.org_id,
              provider: "instagram",
              status: "connected",
              credentials_encrypted: encryptIntegrationCredentials({
                access_token: instagramPage.accessToken || tokens.access_token,
                expires_in: tokens.expires_in,
              }),
              settings_json: {
                instagram_business_account_id: instagramPage.instagram.id,
                instagram_username: instagramPage.instagram.username,
                instagram_name: instagramPage.instagram.name,
                profile_picture_url: instagramPage.instagram.profilePictureUrl,
                facebook_page_id: instagramPage.id,
                facebook_page_name: instagramPage.name,
              },
              connected_at: connectedAt,
              updated_at: connectedAt,
            },
          ]
        : []),
    ];

    const admin = createAdminClient();
    const { error: saveError } = await admin
      .from("integrations")
      .upsert(integrationRows, { onConflict: "org_id,provider" });

    if (saveError) {
      console.error("Failed to save Facebook integration", saveError.code);
      return redirectAndClearState(
        new URL("/integrations?error=save_failed", origin),
      );
    }

    const healthRows = [
      {
        org_id: membership.org_id,
        provider: "facebook",
        status: "healthy",
        last_sync_at: connectedAt,
        items_indexed: 0,
        activity_summary: {
          pagesConnected: pageConnections.length,
          pagesSubscribed: subscribedPageIds.length,
          connectedAt,
        },
      },
      ...(instagramPage?.instagram
        ? [
            {
              org_id: membership.org_id,
              provider: "instagram",
              status: "healthy",
              last_sync_at: connectedAt,
              items_indexed: 0,
              activity_summary: {
                username: instagramPage.instagram.username,
                connectedAt,
              },
            },
          ]
        : []),
    ];
    await admin
      .from("integration_health")
      .upsert(healthRows, { onConflict: "org_id,provider" });

    await admin.from("clippy_activity_log").insert({
      org_id: membership.org_id,
      user_id: user.id,
      action: "integration_connected",
      category: "integration",
      title:
        requestedProvider === "instagram"
          ? "Meta accounts connected"
          : "Facebook connected",
      description: instagramPage?.instagram
        ? "Facebook Page and linked Instagram business account connected"
        : "Facebook Page connection completed",
      metadata: {
        provider: requestedProvider,
        pages: pageConnections.length,
        pagesSubscribed: subscribedPageIds.length,
        instagramConnected: Boolean(instagramPage?.instagram),
      },
      impact_summary: instagramPage?.instagram
        ? "Can now capture Facebook and Instagram enquiries"
        : "Can now capture Facebook enquiries",
      completed_at: connectedAt,
    });

    if (requestedProvider === "instagram" && !instagramPage?.instagram) {
      return redirectAndClearState(
        new URL("/integrations?error=instagram_account_not_found", origin),
      );
    }

    return redirectAndClearState(
      new URL(`/integrations?connected=${requestedProvider}`, origin),
    );
  } catch (error) {
    console.error("Facebook OAuth callback failed", error);
    return redirectAndClearState(
      new URL("/integrations?error=callback_failed", origin),
    );
  }
}
