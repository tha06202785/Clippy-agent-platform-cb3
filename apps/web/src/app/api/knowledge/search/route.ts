import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cosineSimilarity, embedKnowledge } from "@/lib/knowledge-indexing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: membership, error: membershipError } = await supabase.from("user_org_roles")
      .select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membershipError || !membership) return NextResponse.json({ error: "No organisation" }, { status: 400 });

    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const topK = Math.min(Math.max(Number(body.top_k || 5), 1), 20);
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const [queryEmbedding] = await embedKnowledge([query]);
    let chunksQuery = supabase.from("knowledge_chunks").select(
      "id,content,embedding,metadata,knowledge_documents!inner(id,title,layer,source,org_id,status)"
    ).eq("knowledge_documents.org_id", membership.org_id).eq("knowledge_documents.status", "indexed").limit(500);
    if (body.layer) chunksQuery = chunksQuery.eq("knowledge_documents.layer", body.layer);
    const { data: chunks, error: chunksError } = await chunksQuery;
    if (chunksError) throw chunksError;

    const results = (chunks || []).map((chunk: any) => ({
      chunk_id: chunk.id,
      content: chunk.content,
      metadata: chunk.metadata,
      document: chunk.knowledge_documents,
      similarity: cosineSimilarity(queryEmbedding, Array.isArray(chunk.embedding) ? chunk.embedding : []),
    })).filter(item => item.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, topK);

    let clientMemory = null;
    if (body.client_id) {
      const { data, error } = await supabase.from("client_memories").select("*")
        .eq("lead_id", body.client_id).eq("org_id", membership.org_id).maybeSingle();
      if (error) throw error;
      clientMemory = data;
    }
    const { data: agentProfile, error: profileError } = await supabase.from("agent_profiles")
      .select("*").eq("user_id", user.id).eq("org_id", membership.org_id).maybeSingle();
    if (profileError) throw profileError;

    return NextResponse.json({ results, client_memory: clientMemory, agent_profile: agentProfile, query, search_type: "vector" });
  } catch (error) {
    console.error("Knowledge search failed", error);
    return NextResponse.json({ error: "Knowledge search is unavailable" }, { status: 500 });
  }
}
