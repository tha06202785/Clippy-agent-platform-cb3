import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerSchema, validate } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = await getClientIp();
  const { allowed, remaining, resetAt } = checkRateLimit(ip, "auth");
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in " + Math.ceil((resetAt - Date.now()) / 1000) + " seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }

  try {
    const supabase = await createClient();
    const body = await req.json();
    const validation = validate(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { email, password, name } = validation.data!;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
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
      const { data: org, error: orgError } = await supabase.from("orgs").insert({
        name: (name || email) + "'s Agency",
        slug: "org-" + data.user.id.slice(0, 8),
        plan: "free",
      }).select().single();

      if (orgError) {
        console.error("Failed to create org:", orgError);
      } else {
        const { error: memberError } = await supabase.from("org_members").insert({
          org_id: org.id,
          user_id: data.user.id,
          role: "owner",
        });
        if (memberError) {
          console.error("Failed to add org member:", memberError);
        }
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
/bin/bash: line 7: /c/Users/admin/AppData/Local/hermes/cache/terminal/hermes-cwd-1391241d87b5.txt: No such file or directory