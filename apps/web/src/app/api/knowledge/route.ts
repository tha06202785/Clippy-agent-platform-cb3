import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chunkKnowledge, embedKnowledge, KNOWLEDGE_EMBEDDING_MODEL } from "@/lib/knowledge-indexing";

export const dynamic = "force-dynamic";
const LAYERS = new Set(["real_estate_shared", "agency_private", "agent_private", "client_memory"]);
const SOURCES = new Set(["upload","email","calendar","crm","conversation","voice_note","meeting_note","inspection_report","rental_application","listing","template","website","manual_entry","learned_correction"]);

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, orgId: null };
  const { data, error } = await supabase.from("user_org_roles").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (error) throw error;
  return { supabase, user, orgId: data?.org_id || null };
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user, orgId } = await context();
    if (!user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit") || 50), 1), 100);
    let query = supabase.from("knowledge_documents").select("*").eq("org_id", orgId)
      .order("created_at", { ascending: false }).limit(limit);
    if (params.get("layer")) query = query.eq("layer", params.get("layer"));
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Knowledge list failed", error);
    return NextResponse.json({ error: "Knowledge documents are unavailable" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, user, orgId } = await context();
  if (!user || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let documentId: string | null = null;
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!title || !content || !LAYERS.has(body.layer) || !SOURCES.has(body.source)) {
      return NextResponse.json({ error: "Valid title, content, layer and source are required" }, { status: 400 });
    }
    if (content.length > 200000) return NextResponse.json({ error: "Document is too large" }, { status: 413 });

    const chunks = chunkKnowledge(content);
    if (!chunks.length) return NextResponse.json({ error: "Document contains no indexable content" }, { status: 400 });

    const { data: document, error: createError } = await supabase.from("knowledge_documents").insert({
      org_id: orgId, user_id: user.id, title, content, layer: body.layer, source: body.source,
      source_metadata: body.source_metadata || {}, is_public: Boolean(body.is_public),
      status: "processing", word_count: content.split(/\s+/).length, chunk_count: chunks.length,
      embedding_model: KNOWLEDGE_EMBEDDING_MODEL,
    }).select().single();
    if (createError) throw createError;
    documentId = document.id;

    const embeddings = await embedKnowledge(chunks);
    const { error: chunkError } = await supabase.from("knowledge_chunks").insert(
      chunks.map((chunk, index) => ({
        document_id: document.id, chunk_index: index, content: chunk,
        embedding: embeddings[index], metadata: { title, layer: body.layer, source: body.source },
      })),
    );
    if (chunkError) throw chunkError;

    const indexedAt = new Date().toISOString();
    const { data: indexed, error: indexError } = await supabase.from("knowledge_documents")
      .update({ status: "indexed", indexed_at: indexedAt }).eq("id", document.id).eq("org_id", orgId).select().single();
    if (indexError) throw indexError;
    return NextResponse.json(indexed, { status: 201 });
  } catch (error) {
    console.error("Knowledge indexing failed", error);
    if (documentId) await supabase.from("knowledge_documents").update({ status: "failed" }).eq("id", documentId).eq("org_id", orgId);
    return NextResponse.json({ error: "Document could not be indexed" }, { status: 502 });
  }
}
