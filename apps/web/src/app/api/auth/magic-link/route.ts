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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL + "/dashboard",
      },
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Magic link sent to " + email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to send magic link" },
      { status: 500 }
    );
  }
}
