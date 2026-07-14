import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 401 });
  }
}
