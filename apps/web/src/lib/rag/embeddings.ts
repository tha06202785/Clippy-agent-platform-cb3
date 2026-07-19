/**
 * Clippy RAG - Retrieval Augmented Generation Service
 * Handles embedding generation, vector search, and knowledge retrieval
 */

import { createClient } from "@/lib/supabase/server";

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: { total_tokens: number };
}

export interface SearchRequest {
  query: string;
  orgId: string;
  layer?: string;
  clientId?: string;
  topK?: number;
}

export interface SearchResult {
  document: any;
  chunk: any;
  score: number;
  layer: string;
}

// Generate embeddings using OpenAI (or compatible) API
export async function generateEmbeddings(texts: string[], model = "text-embedding-3-small"): Promise<EmbeddingResponse> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OLLAMA_API_KEY;
  
  if (!apiKey) {
    throw new Error("Embedding API key not configured");
  }

  // Use OpenAI-compatible endpoint
  const endpoint = process.env.EMBEDDING_ENDPOINT || "https://api.openai.com/v1/embeddings";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": ,
    },
    body: JSON.stringify({
      model,
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    throw new Error();
  }

  const data = await response.json();
  return {
    embeddings: data.data.map((d: any) => d.embedding),
    model: data.model,
    usage: data.usage,
  };
}

// Chunk text for RAG (split into ~500 token chunks)
export function chunkText(content: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  const words = content.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks.length > 0 ? chunks : [content];
}

// Store knowledge chunks with embeddings
export async function storeKnowledgeChunks(
  supabase: any,
  documentId: string,
  chunks: string[],
  embeddings: number[][]
) {
  const chunkRecords = chunks.map((content, index) => ({
    document_id: documentId,
    chunk_index: index,
    content,
    embedding: JSON.stringify(embeddings[index]),
    metadata: { chunk_size: content.split(/\s+/).length },
  }));

  const { error } = await supabase
    .from("knowledge_chunks")
    .insert(chunkRecords);

  if (error) {
    throw new Error();
  }

  return chunkRecords.length;
}

// Vector similarity search (cosine similarity)
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Search knowledge base with query embedding
export async function searchKnowledge(
  supabase: any,
  queryEmbedding: number[],
  orgId: string,
  options: { layer?: string; clientId?: string; topK?: number } = {}
): Promise<SearchResult[]> {
  const { layer, clientId, topK = 5 } = options;

  // Get all chunks for the org
  let query = supabase
    .from("knowledge_chunks")
    .select("*, knowledge_documents(layer, client_id, is_public)")
    .eq("knowledge_documents.org_id", orgId)
    .eq("knowledge_documents.status", "indexed");

  if (layer) {
    query = query.eq("knowledge_documents.layer", layer);
  }

  if (clientId) {
    // Prioritize client memory for this specific client
    query = query.or();
  }

  const { data: chunks } = await query.limit(100);

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const results: SearchResult[] = chunks
    .map((chunk: any) => {
      const storedEmbedding = JSON.parse(chunk.embedding);
      const score = cosineSimilarity(queryEmbedding, storedEmbedding);
      return {
        document: chunk.knowledge_documents,
        chunk,
        score,
        layer: chunk.knowledge_documents.layer,
      };
    })
    .filter((r: SearchResult) => r.score > 0.3) // Threshold for relevance
    .sort((a: SearchResult, b: SearchResult) => b.score - a.score)
    .slice(0, topK);

  return results;
}

// RAG retrieval for AI responses
// Priority: Client Memory > Agent Profile > Agency > Shared
export async function retrieveForAIResponse(
  supabase: any,
  query: string,
  orgId: string,
  userId: string,
  clientId?: string
): Promise<string> {
  // Generate query embedding
  const { embeddings } = await generateEmbeddings([query]);
  const queryEmbedding = embeddings[0];

  // Search with priority order
  const results: SearchResult[] = [];

  // 1. Client Memory (highest priority)
  if (clientId) {
    const clientResults = await searchKnowledge(supabase, queryEmbedding, orgId, {
      clientId,
      layer: "client_memory",
      topK: 3,
    });
    results.push(...clientResults);
  }

  // 2. Agent Profile
  const agentResults = await searchKnowledge(supabase, queryEmbedding, orgId, {
    layer: "agent_private",
    topK: 2,
  });
  results.push(...agentResults);

  // 3. Agency Knowledge
  const agencyResults = await searchKnowledge(supabase, queryEmbedding, orgId, {
    layer: "agency_private",
    topK: 3,
  });
  results.push(...agencyResults);

  // 4. Shared Real Estate Knowledge (lowest priority)
  const sharedResults = await searchKnowledge(supabase, queryEmbedding, orgId, {
    layer: "real_estate_shared",
    topK: 2,
  });
  results.push(...sharedResults);

  // Build context from results
  const contextParts: string[] = [];
  
  if (results.length > 0) {
    contextParts.push("Relevant knowledge:");
    results.forEach((result, i) => {
      contextParts.push();
    });
  }

  return contextParts.join("
");
}

// Auto-learn from source (email, calendar, CRM, etc.)
export async function autoLearnFromSource(
  supabase: any,
  orgId: string,
  source: string,
  content: string,
  metadata: any = {}
) {
  // Determine layer based on source
  const layerMap: Record<string, string> = {
    email: "agency_private",
    calendar: "agency_private",
    crm: "client_memory",
    conversation: "client_memory",
    voice_note: "agent_private",
    meeting_note: "agency_private",
    inspection_report: "client_memory",
    rental_application: "client_memory",
    listing: "agency_private",
    template: "agency_private",
  };

  const layer = metadata.layer || layerMap[source] || "agency_private";
  const clientId = metadata.client_id;
  const userId = metadata.user_id;

  // Chunk content
  const chunks = chunkText(content);
  
  // Generate embeddings
  const { embeddings } = await generateEmbeddings(chunks);

  // Create document record
  const { data: document } = await supabase
    .from("knowledge_documents")
    .insert({
      org_id: orgId,
      user_id: userId,
      client_id: clientId,
      layer,
      source,
      source_metadata: metadata,
      title: metadata.title || ,
      content,
      status: "processing",
    })
    .select()
    .single();

  if (!document) {
    throw new Error("Failed to create knowledge document");
  }

  // Store chunks
  await storeKnowledgeChunks(supabase, document.id, chunks, embeddings);

  // Mark as indexed
  await supabase
    .from("knowledge_documents")
    .update({
      status: "indexed",
      indexed_at: new Date().toISOString(),
      chunk_count: chunks.length,
      word_count: content.split(/\s+/).length,
    })
    .eq("id", document.id);

  return document;
}
