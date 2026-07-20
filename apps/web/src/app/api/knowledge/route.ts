import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/knowledge - List knowledge documents
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const layer = searchParams.get("layer");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("knowledge_documents")
      .select("*")
      .eq("org_id", orgMember.org_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (layer) {
      query = query.eq("layer", layer);
    }

    const { data: documents } = await query;

    return NextResponse.json(documents || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/knowledge - Create knowledge document
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const { title, content, layer, source, source_metadata, is_public } = body;

    if (!title || !content || !layer || !source) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: document, error } = await supabase
      .from("knowledge_documents")
      .insert({
        org_id: orgMember.org_id,
        user_id: user.id,
        title,
        content,
        layer,
        source,
        source_metadata: source_metadata || {},
        is_public: is_public || false,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger embedding generation (async)
    // This would call an embedding service in production
    // For now, we just mark it as indexed
    await supabase
      .from("knowledge_documents")
      .update({ status: "indexed", indexed_at: new Date().toISOString() })
      .eq("id", document.id);

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
