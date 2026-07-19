import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/knowledge/search - Semantic search across knowledge layers
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) return NextResponse.json({ error: "No org" }, { status: 400 });

    const body = await req.json();
    const { query, layer, client_id, top_k = 5 } = body;

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // In production, generate embedding for the query
    // For now, we'll do a text-based search as a placeholder
    // This would use OpenAI embeddings or similar in production
    
    // Priority order: Client Memory > Agent Profile > Agency > Shared
    let knowledgeQuery = supabase
      .from("knowledge_documents")
      .select("*, knowledge_chunks(content, metadata)")
      .eq("org_id", orgMember.org_id)
      .eq("status", "indexed");

    if (layer) {
      knowledgeQuery = knowledgeQuery.eq("layer", layer);
    }

    // Text-based search (replace with vector similarity in production)
    knowledgeQuery = knowledgeQuery.or();

    const { data: documents } = await knowledgeQuery.limit(top_k);

    // Also search client memory if client_id provided
    let clientMemory = null;
    if (client_id) {
      const { data: memory } = await supabase
        .from("client_memories")
        .select("*")
        .eq("lead_id", client_id)
        .eq("org_id", orgMember.org_id)
        .single();
      clientMemory = memory;
    }

    // Get agent profile for personalization
    const { data: agentProfile } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("org_id", orgMember.org_id)
      .single();

    return NextResponse.json({
      results: documents || [],
      client_memory: clientMemory,
      agent_profile: agentProfile,
      query,
      search_type: "text", // Would be "vector" in production
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
