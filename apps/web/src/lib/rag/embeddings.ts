/**
 * Clippy RAG - Retrieval Augmented Generation Service
 * Handles embedding generation, vector search, and knowledge retrieval
 */

import { createClient } from "@/lib/supabase/server";
import {
  embedKnowledge,
  KNOWLEDGE_EMBEDDING_MODEL,
} from "@/lib/knowledge-indexing";

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

type SourceDocument = {
  id: string;
  title: string | null;
  content: string;
  source: string;
  source_metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

const CALENDAR_INTENT =
  /\b(calendar|schedule|agenda|appointment|appointments|meeting|meetings|inspection|inspections|upcoming)\b/i;
const EMAIL_INTENT =
  /\b(email|emails|mail|gmail|inbox|message|messages)\b/i;
const MAX_SOURCE_CONTENT_CHARS = 1_000;
export const MAX_KNOWLEDGE_CONTEXT_CHARS = 8_000;

function boundedText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export function limitKnowledgeContext(
  parts: string[],
  maxChars = MAX_KNOWLEDGE_CONTEXT_CHARS,
) {
  return boundedText(parts.join("\n"), maxChars);
}

export function detectKnowledgeSourceIntent(query: string) {
  return {
    calendar: CALENDAR_INTENT.test(query),
    email: EMAIL_INTENT.test(query),
  };
}

function metadataText(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function retrieveSourceDocuments(
  supabase: any,
  orgId: string,
  userId: string,
  source: "calendar" | "email",
  now = new Date(),
): Promise<SourceDocument[]> {
  let request = supabase
    .from("knowledge_documents")
    .select("id,title,content,source,source_metadata,updated_at")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "indexed")
    .eq("source", source)
    .limit(source === "calendar" ? 50 : 10);

  if (source === "email") {
    request = request.order("updated_at", { ascending: false });
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(`Knowledge ${source} lookup failed: ${error.message}`);
  }

  const documents = (data ?? []) as SourceDocument[];
  if (source === "email") return documents.slice(0, 3);

  const nowMs = now.getTime();
  return documents
    .map((document) => ({
      document,
      startsAt: metadataText(document.source_metadata, "starts_at"),
    }))
    .filter(({ startsAt }) => {
      if (!startsAt) return false;
      const startsAtMs = Date.parse(startsAt);
      return Number.isFinite(startsAtMs) && startsAtMs >= nowMs;
    })
    .sort(
      (a, b) =>
        Date.parse(a.startsAt as string) - Date.parse(b.startsAt as string),
    )
    .slice(0, 5)
    .map(({ document }) => document);
}

function formatSourceDocument(document: SourceDocument): string {
  const metadata = document.source_metadata;
  if (document.source === "calendar") {
    const startsAt = metadataText(metadata, "starts_at");
    const endsAt = metadataText(metadata, "ends_at");
    const location = metadataText(metadata, "location");
    return [
      `Event: ${document.title || "Untitled calendar event"}`,
      startsAt ? `Starts: ${startsAt}` : null,
      endsAt ? `Ends: ${endsAt}` : null,
      location ? `Location: ${location}` : null,
      boundedText(document.content, MAX_SOURCE_CONTENT_CHARS),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Email: ${document.title || "Untitled email"}`,
    boundedText(document.content, MAX_SOURCE_CONTENT_CHARS),
  ].join("\n");
}

// Generate embeddings using the same Ollama model used for indexing.
export async function generateEmbeddings(
  texts: string[],
  _model = KNOWLEDGE_EMBEDDING_MODEL,
): Promise<EmbeddingResponse> {
  const embeddings = await embedKnowledge(texts);
  return {
    embeddings,
    model: KNOWLEDGE_EMBEDDING_MODEL,
    usage: { total_tokens: 0 },
  };
}

// Chunk text for RAG (split into ~500 token chunks)
export function chunkText(
  content: string,
  chunkSize = 500,
  overlap = 50,
): string[] {
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
  embeddings: number[][],
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
  if (!a.length || a.length !== b.length) return 0;
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
  options: { layer?: string; clientId?: string; topK?: number } = {},
): Promise<SearchResult[]> {
  const { layer, clientId, topK = 5 } = options;

  // Get all chunks for the org
  let query = supabase
    .from("knowledge_chunks")
    .select(
      "*, knowledge_documents!inner(layer, client_id, is_public, org_id, status)",
    )
    .eq("knowledge_documents.org_id", orgId)
    .eq("knowledge_documents.status", "indexed");

  if (layer) {
    query = query.eq("knowledge_documents.layer", layer);
  }

  if (clientId) {
    // Prioritize client memory for this specific client
    query = query.eq("knowledge_documents.client_id", clientId);
  }

  const { data: chunks, error } = await query.limit(100);

  if (error) {
    throw new Error(`Knowledge chunk lookup failed: ${error.message}`);
  }

  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const results: SearchResult[] = chunks
    .map((chunk: any) => {
      const storedEmbedding = Array.isArray(chunk.embedding)
        ? chunk.embedding
        : JSON.parse(chunk.embedding);
      const score = cosineSimilarity(queryEmbedding, storedEmbedding);
      return {
        document: chunk.knowledge_documents,
        chunk,
        score,
        layer: chunk.knowledge_documents.layer,
      };
    })
    .filter((r: SearchResult) => r.score > 0.05)
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
  clientId?: string,
): Promise<string> {
  const sourceIntent = detectKnowledgeSourceIntent(query);
  const sourceDocuments: SourceDocument[] = [];

  const sourceLookups: Promise<SourceDocument[]>[] = [];
  if (sourceIntent.calendar)
    sourceLookups.push(
      retrieveSourceDocuments(supabase, orgId, userId, "calendar"),
    );
  if (sourceIntent.email)
    sourceLookups.push(
      retrieveSourceDocuments(supabase, orgId, userId, "email"),
    );
  if (sourceLookups.length > 0) {
    sourceDocuments.push(...(await Promise.all(sourceLookups)).flat());
  }

  // Generate query embedding
  const { embeddings } = await generateEmbeddings([query]);
  const queryEmbedding = embeddings[0];

  // Search with priority order
  const searches: Promise<SearchResult[]>[] = [];

  // 1. Client Memory (highest priority)
  if (clientId) {
    searches.push(
      searchKnowledge(supabase, queryEmbedding, orgId, {
        clientId,
        layer: "client_memory",
        topK: 2,
      }),
    );
  }

  // 2. Agent Profile
  searches.push(
    searchKnowledge(supabase, queryEmbedding, orgId, {
      layer: "agent_private",
      topK: 1,
    }),
  );

  // 3. Agency Knowledge
  searches.push(
    searchKnowledge(supabase, queryEmbedding, orgId, {
      layer: "agency_private",
      topK: 2,
    }),
  );

  // 4. Shared Real Estate Knowledge (lowest priority)
  searches.push(
    searchKnowledge(supabase, queryEmbedding, orgId, {
      layer: "real_estate_shared",
      topK: 1,
    }),
  );

  const results = (await Promise.all(searches)).flat();

  // Build context from results
  const contextParts: string[] = [];

  if (sourceDocuments.length > 0) {
    contextParts.push("Authorised connected-source records:");
    sourceDocuments.forEach((document, i) => {
      contextParts.push(
        `[Connected record ${i + 1}]\n${formatSourceDocument(document)}`,
      );
    });
  }

  if (results.length > 0) {
    contextParts.push("Semantically related knowledge:");
    results.forEach((result, i) => {
      contextParts.push(
        `[${i + 1}] ${boundedText(result.chunk?.content || result.document?.content || "", 1_200)}`,
      );
    });
  }

  return limitKnowledgeContext(contextParts);
}

// Auto-learn from source (email, calendar, CRM, etc.)
export async function autoLearnFromSource(
  supabase: any,
  orgId: string,
  source: string,
  content: string,
  metadata: any = {},
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
      title: metadata.title || content.slice(0, 100),
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
