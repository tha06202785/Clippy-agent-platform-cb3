import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ComposioConfigurationError,
  ComposioRequestError,
  createComposioConnectLink,
  getComposioUserId,
  type ClippyComposioToolkit,
} from "@/lib/composio";
import { getAppOrigin } from "@/lib/app-origin";
import { COMPOSIO_OAUTH_STATE_COOKIE } from "@/lib/oauth-state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TOOLKITS = new Set<ClippyComposioToolkit>(["whatsapp"]);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ toolkit: string }> },
) {
  const { toolkit: rawToolkit } = await context.params;
  const toolkit = rawToolkit.toLowerCase() as ClippyComposioToolkit;
  if (!ALLOWED_TOOLKITS.has(toolkit)) {
    return NextResponse.json(
      { error: "Unsupported integration" },
      { status: 404 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/sign-in?next=/integrations", req.url),
      );
    }

    const { data: membership } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership?.org_id) {
      return NextResponse.redirect(
        new URL("/integrations?error=no_org", req.url),
      );
    }

    const state = randomUUID();
    const composioUserId = getComposioUserId(membership.org_id, user.id);
    const callbackUrl = new URL(
      "/api/integrations/composio/callback",
      getAppOrigin(),
    );
    callbackUrl.searchParams.set("toolkit", toolkit);
    callbackUrl.searchParams.set("state", state);

    const link = await createComposioConnectLink({
      toolkit,
      userId: composioUserId,
      callbackUrl: callbackUrl.toString(),
      alias: `clippy-${toolkit}-${composioUserId.slice(-8)}-${state.slice(0, 8)}`,
    });

    const response = NextResponse.redirect(link.redirect_url);
    response.cookies.set(COMPOSIO_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: callbackUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/integrations/composio",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const code =
      error instanceof ComposioConfigurationError
        ? "composio_not_configured"
        : error instanceof ComposioRequestError
          ? "composio_unavailable"
          : "composio_failed";
    console.error("Composio connection start failed", {
      toolkit,
      code,
      status: error instanceof ComposioRequestError ? error.status : undefined,
    });
    return NextResponse.redirect(
      new URL(`/integrations?error=${code}`, req.url),
    );
  }
}
