import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_RESET_PATH } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    console.warn("Auth callback exchange failed", {
      next,
      errorCode: error.code,
      status: error.status,
    });
  }

  if (next === PASSWORD_RESET_PATH) {
    return NextResponse.redirect(
      new URL("/forgot-password?error=invalid_recovery_link", origin),
    );
  }

  return NextResponse.redirect(
    new URL("/sign-in?error=auth_callback_failed", origin),
  );
}
