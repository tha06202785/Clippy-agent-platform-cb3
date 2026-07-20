import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/agent-profile - Get current user's AI profile

// Handle "Teach Clippy" feedback
async function handleTeach(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

  const body = await req.json();
  const {
    original_response,
    correction_type,
    user_feedback,
    applied_to,
    guidance_text,
    examples,
  } = body;

  const { data: correction, error } = await supabase
    .from("clippy_corrections")
    .insert({
      org_id: orgMember.org_id,
      user_id: user.id,
      original_response,
      correction_type,
      user_feedback,
      applied_to,
      guidance_text,
      examples,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update agent profile confidence score
  await supabase
    .from("agent_profiles")
    .update({
      corrections_made: supabase.raw("corrections_made + 1"),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("org_id", orgMember.org_id);

  return NextResponse.json(correction, { status: 201 });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const { data: profile } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("org_id", orgMember.org_id)
      .single();

    return NextResponse.json(profile || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agent-profile - Create or update agent profile
export async function POST(req: NextRequest) {
  try {
    // Route /teach requests to correction handler
    if (req.nextUrl.pathname.endsWith('/teach')) {
      return handleTeach(req);
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const {
      writing_style,
      preferred_greetings,
      negotiation_style,
      communication_tone,
      favourite_templates,
      frequently_used_suburbs,
      working_hours,
      preferred_communication,
    } = body;

    const { data: existing } = await supabase
      .from("agent_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("org_id", orgMember.org_id)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from("agent_profiles")
        .update({
          writing_style,
          preferred_greetings,
          negotiation_style,
          communication_tone,
          favourite_templates,
          frequently_used_suburbs,
          working_hours,
          preferred_communication,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("agent_profiles")
        .insert({
          user_id: user.id,
          org_id: orgMember.org_id,
          writing_style,
          preferred_greetings,
          negotiation_style,
          communication_tone,
          favourite_templates,
          frequently_used_suburbs,
          working_hours,
          preferred_communication,
          status: "learning",
        })
        .select()
        .single();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const {
      original_response,
      correction_type,
      user_feedback,
      applied_to,
      guidance_text,
      examples,
    } = body;

    const { data: correction, error } = await supabase
      .from("clippy_corrections")
      .insert({
        org_id: orgMember.org_id,
        user_id: user.id,
        original_response,
        correction_type,
        user_feedback,
        applied_to,
        guidance_text,
        examples,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update agent profile confidence score
    await supabase
      .from("agent_profiles")
      .update({
        corrections_made: supabase.raw("corrections_made + 1"),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("org_id", orgMember.org_id);

    return NextResponse.json(correction, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
