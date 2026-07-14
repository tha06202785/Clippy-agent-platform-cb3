import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.NEXT_PUBLIC_APP_URL + "/api/auth/callback",
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Password reset email sent to " + email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send reset email" },
      { status: 500 }
    );
  }
}
