import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { emailSchema, validate } from "@/lib/validation";
import { getPasswordResetRedirectUrl } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "auth");
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests. Try again in " +
          Math.ceil((resetAt - Date.now()) / 1000) +
          " seconds.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      },
    );
  }

  try {
    const supabase = await createClient();
    const validation = validate(emailSchema, await req.json());

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email } = validation.data!;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, a password reset link is on its way.",
    });
  } catch (error) {
    console.error("Password reset request failed", error);
    return NextResponse.json(
      { error: "We could not send the reset email. Please try again." },
      { status: 500 },
    );
  }
}
