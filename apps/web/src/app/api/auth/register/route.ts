import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || "" },
        emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL + "/api/auth/callback",
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: orgError } = await supabase.from("orgs").insert({
        name: (name || email) + "'s Agency",
        slug: "org-" + data.user.id.slice(0, 8),
        plan_id: "free",
      }).select().single();

      if (orgError) {
        console.error("Failed to create org:", orgError);
      }
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 400 }
    );
  }
}
