import { createHash } from "node:crypto";
import {
  cosineSimilarity,
  embedKnowledge,
  KNOWLEDGE_EMBEDDING_MODEL,
} from "@/lib/knowledge-indexing";

type SupabaseLike = any;
type JsonRecord = Record<string, unknown>;

export type LearningSettings = {
  id: string;
  org_id: string;
  user_id: string;
  learning_enabled: boolean;
  learn_from_sent: boolean;
  learn_from_approved: boolean;
  learn_from_corrections: boolean;
  learn_client_preferences: boolean;
  retain_raw_examples: boolean;
  retention_days: number;
  automation_level: "observe" | "assist" | "draft" | "trusted";
  excluded_channels: string[];
  last_message_scan_at: string | null;
  last_sent_sync_at: string | null;
  sent_page_token: string | null;
  sent_backfill_complete: boolean;
};

export type CommunicationSource =
  | "gmail_sent"
  | "approved_draft"
  | "agent_edit"
  | "manual"
  | "outbound_message";

export type AgentStyleProfile = {
  summary: string;
  tone: string;
  averageWords: number;
  greetings: string[];
  signoffs: string[];
  rules: {
    tone: string;
    sentence_style: string;
    paragraph_style: string;
    formality: string;
    punctuation: string;
    emoji: string;
    explicit: string[];
  };
  sampleCount: number;
  confidence: number;
};

export type AdaptiveContext = {
  enabled: boolean;
  prompt: string;
  explanation: {
    profileConfidence: number;
    sampleCount: number;
    examplesUsed: number;
    situation: string;
    clientPreferences: string[];
    lastLearnedAt: string | null;
  };
};

const MAX_EXAMPLE_CHARS = 6_000;
const STYLE_SAMPLE_LIMIT = 500;
const RETRIEVAL_CANDIDATE_LIMIT = 120;
const MESSAGE_SCAN_LIMIT = 250;
const COMMON_SIGNOFFS = [
  "kind regards",
  "warm regards",
  "best regards",
  "regards",
  "many thanks",
  "thanks again",
  "thank you",
  "thanks",
  "cheers",
  "best",
];

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseWhitespace(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripQuotedHistory(value: string) {
  const kept: string[] = [];
  for (const line of value.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (
      /^On .+wrote:$/i.test(trimmed) ||
      /^-{2,}\s*(?:Original Message|Forwarded message)\s*-{2,}$/i.test(
        trimmed,
      ) ||
      /^From:\s.+/i.test(trimmed)
    ) {
      break;
    }
    if (!trimmed.startsWith(">")) kept.push(line);
  }
  return kept.join("\n");
}

/**
 * Removes client and transaction identifiers before an example is retained.
 * The resulting text is useful for tone retrieval but deliberately unsuitable
 * as a source of client facts.
 */
export function sanitiseCommunicationText(
  input: string,
  options: { names?: Array<string | null | undefined> } = {},
) {
  let value = stripQuotedHistory(input)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  value = value
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[link]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(
      /\b\d{1,6}\s+[A-Za-z0-9'’-]+(?:\s+[A-Za-z0-9'’-]+){0,7}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Crescent|Cres|Lane|Ln|Place|Pl|Parade|Pde|Boulevard|Blvd|Highway|Hwy|Way|Terrace|Tce)(?:,\s*[A-Za-z][A-Za-z'’ -]{1,40})?/gi,
      "[property]",
    )
    .replace(/\$\s?\d[\d,.]*(?:\s?(?:k|m|million|thousand))?/gi, "[amount]")
    .replace(
      /(?:\+?61\s?4|04)(?:[\s.-]?\d){8}\b|(?:\+?61\s?[2378]|0[2378])(?:[\s.-]?\d){8}\b/g,
      "[phone]",
    )
    .replace(/\b\d{1,2}[:.]\d{2}\s?(?:am|pm)?\b/gi, "[time]")
    .replace(
      /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|20\d{2}-\d{2}-\d{2})\b/g,
      "[date]",
    )
    .replace(/\b(?:0[289]\d{2}|[1-8]\d{3}|9[0-7]\d{2})\b/g, "[postcode]");

  for (const name of options.names || []) {
    const clean = name?.trim();
    if (clean && clean.length >= 2) {
      value = value.replace(
        new RegExp(`\\b${escapeRegExp(clean)}\\b`, "gi"),
        "[name]",
      );
    }
  }

  value = value.replace(
    /^(\s*(?:hi|hello|hey|dear|good morning|good afternoon))\s+[^,\n]{1,60}(,?)/im,
    "$1 [client]$2",
  );

  const lines = normaliseWhitespace(value).split("\n");
  const signoffIndex = lines.findIndex((line) =>
    COMMON_SIGNOFFS.includes(
      line
        .replace(/[,.!]$/, "")
        .trim()
        .toLowerCase(),
    ),
  );
  if (signoffIndex >= 0) {
    for (
      let index = signoffIndex + 1;
      index < Math.min(lines.length, signoffIndex + 3);
      index += 1
    ) {
      if (lines[index] && !/^\[(?:email|phone|link)]$/i.test(lines[index])) {
        lines[index] = "[agent]";
      }
    }
  }

  return normaliseWhitespace(lines.join("\n")).slice(0, MAX_EXAMPLE_CHARS);
}

export function classifyCommunicationSituation(
  subject: string,
  content: string,
) {
  const value = `${subject} ${content}`.toLowerCase();
  if (/inspection|open home|open house|viewing/.test(value))
    return /confirm|booked|booking/.test(value)
      ? "inspection_confirmation"
      : "inspection_coordination";
  if (/offer|price|negotiat|contract/.test(value)) return "offer_negotiation";
  if (
    /follow(?:ing|ed)?[ -]?up|checking in|touching base|haven't heard|no response/.test(
      value,
    )
  )
    return "follow_up";
  if (/apprais|valuation|market estimate/.test(value)) return "appraisal";
  if (/application|tenant|lease|rent/.test(value)) return "rental";
  if (/thank|congrat/.test(value)) return "thank_you";
  if (/reply|re:|enquir|inquir|interested/.test(value)) return "enquiry_reply";
  return "general";
}

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function greetingFrom(content: string) {
  const first =
    content
      .split("\n")
      .find((line) => line.trim())
      ?.trim() || "";
  const match = first.match(
    /^(hi|hello|hey|dear|good morning|good afternoon)(?:\s+\[client])?[,!]*/i,
  );
  return match?.[0]
    .replace(/\[client]/i, "[client]")
    .replace(/[,!]$/, "")
    .trim();
}

function signoffFrom(content: string) {
  const lines = content.split("\n").map((line) =>
    line
      .replace(/[,.!]$/, "")
      .trim()
      .toLowerCase(),
  );
  return COMMON_SIGNOFFS.find((signoff) => lines.includes(signoff)) || "";
}

export function deriveAgentStyleProfile(
  examples: string[],
  explicitRules: string[] = [],
): AgentStyleProfile {
  const usable = examples.map(normaliseWhitespace).filter(Boolean);
  const words = usable.map(
    (item) => item.match(/[\p{L}\p{N}]+/gu)?.length || 0,
  );
  const averageWords = usable.length
    ? Math.max(
        1,
        Math.round(
          words.reduce((sum, count) => sum + count, 0) / usable.length,
        ),
      )
    : 0;
  const exclamationRate = usable.length
    ? usable.filter((item) => item.includes("!")).length / usable.length
    : 0;
  const emojiRate = usable.length
    ? usable.filter((item) => /\p{Extended_Pictographic}/u.test(item)).length /
      usable.length
    : 0;
  const contractionRate = usable.length
    ? usable.filter((item) =>
        /\b(?:I'm|I'll|we'll|can't|won't|don't|it's|you're)\b/i.test(item),
      ).length / usable.length
    : 0;
  const thanksRate = usable.length
    ? usable.filter((item) => /\b(?:thanks|thank you|appreciate)\b/i.test(item))
        .length / usable.length
    : 0;
  const questionRate = usable.length
    ? usable.filter((item) => item.includes("?")).length / usable.length
    : 0;
  const paragraphCounts = usable.map((item) => item.split(/\n\n+/).length);
  const averageParagraphs = usable.length
    ? paragraphCounts.reduce((sum, count) => sum + count, 0) / usable.length
    : 0;
  const greetings = topValues(
    usable
      .map(greetingFrom)
      .filter(
        (value): value is string => typeof value === "string" && Boolean(value),
      ),
    4,
  );
  const signoffs = topValues(usable.map(signoffFrom).filter(Boolean), 4);
  const length =
    averageWords <= 45
      ? "concise"
      : averageWords <= 100
        ? "balanced"
        : "detailed";
  const warmth = thanksRate >= 0.3 || exclamationRate >= 0.25 ? "warm" : "calm";
  const formality = contractionRate >= 0.25 ? "conversational" : "professional";
  const tone = `${warmth}, ${formality} and ${length}`;
  const confidence = Math.min(
    95,
    Math.round(35 + Math.sqrt(usable.length) * 8),
  );

  return {
    summary: usable.length
      ? `A ${warmth}, ${formality} voice with ${length} messages, ${
          averageParagraphs >= 2
            ? "short separated paragraphs"
            : "compact paragraphs"
        }, and ${questionRate >= 0.3 ? "clear next-step questions" : "direct next steps"}.`
      : "Clippy is still learning this agent's communication voice.",
    tone,
    averageWords,
    greetings,
    signoffs,
    rules: {
      tone,
      sentence_style:
        averageWords <= 55
          ? "Prefer short, direct sentences."
          : "Use a natural mix of short and medium sentences.",
      paragraph_style:
        averageParagraphs >= 2
          ? "Break the message into short, readable paragraphs."
          : "Keep the message compact unless detail is necessary.",
      formality:
        formality === "conversational"
          ? "Use natural contractions and professional conversational language."
          : "Use polished professional language without sounding legalistic.",
      punctuation:
        exclamationRate >= 0.3
          ? "Occasional exclamation marks are characteristic; do not overuse them."
          : "Use restrained punctuation.",
      emoji:
        emojiRate >= 0.15
          ? "An occasional relevant emoji is acceptable."
          : "Do not add emojis unless the agent explicitly asks.",
      explicit: explicitRules,
    },
    sampleCount: usable.length,
    confidence,
  };
}

export function inferClientCommunicationPreferences(content: string) {
  const value = content.toLowerCase();
  const preferences: {
    channel?: string;
    length?: string;
    tone?: string;
    reminders?: string;
    language?: string;
    confidence: number;
  } = { confidence: 0 };

  if (/\b(?:please|can you|could you)\s+(?:text|sms)|\btext me\b/.test(value)) {
    preferences.channel = "sms";
    preferences.confidence = 95;
  } else if (
    /\b(?:please|can you|could you)\s+(?:email)|\bemail me\b/.test(value)
  ) {
    preferences.channel = "email";
    preferences.confidence = 95;
  } else if (
    /\b(?:please|can you|could you)\s+(?:call)|\bcall me\b/.test(value)
  ) {
    preferences.channel = "phone";
    preferences.confidence = 95;
  } else if (/\bwhatsapp me\b|\buse whatsapp\b/.test(value)) {
    preferences.channel = "whatsapp";
    preferences.confidence = 95;
  }

  if (
    /\b(?:keep it|make it|please be)\s+(?:brief|short)|\bquick summary\b/.test(
      value,
    )
  ) {
    preferences.length = "brief";
    preferences.confidence = Math.max(preferences.confidence, 90);
  } else if (
    /\b(?:more detail|detailed breakdown|full details|everything in writing)\b/.test(
      value,
    )
  ) {
    preferences.length = "detailed";
    preferences.confidence = Math.max(preferences.confidence, 90);
  }

  if (
    /\b(?:please be formal|formal communication|in writing only)\b/.test(value)
  ) {
    preferences.tone = "formal";
    preferences.confidence = Math.max(preferences.confidence, 90);
  } else if (
    /\b(?:keep it casual|no need to be formal|casual is fine)\b/.test(value)
  ) {
    preferences.tone = "casual";
    preferences.confidence = Math.max(preferences.confidence, 90);
  }

  if (
    /\b(?:don't|do not|no)\s+(?:remind|follow up)|\bstop (?:reminders|following up)\b/.test(
      value,
    )
  ) {
    preferences.reminders = "do_not_remind";
    preferences.confidence = 100;
  } else if (/\b(?:please )?(?:remind|follow up with) me\b/.test(value)) {
    preferences.reminders = "reminders_welcome";
    preferences.confidence = Math.max(preferences.confidence, 90);
  }

  const language = value.match(
    /\b(?:please (?:write|reply|communicate)|communicate with me) in (english|mandarin|cantonese|arabic|vietnamese|hindi|punjabi|spanish|italian|greek)\b/,
  )?.[1];
  if (language) {
    preferences.language = language;
    preferences.confidence = Math.max(preferences.confidence, 95);
  }

  return preferences;
}

export async function getLearningSettings(
  supabase: SupabaseLike,
  orgId: string,
  userId: string,
): Promise<LearningSettings | null> {
  const { data, error } = await supabase
    .from("communication_learning_settings")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error)
    throw new Error(`Learning settings lookup failed: ${error.message}`);
  return (data as LearningSettings | null) || null;
}

export async function ensureLearningSettings(
  supabase: SupabaseLike,
  orgId: string,
  userId: string,
) {
  const existing = await getLearningSettings(supabase, orgId, userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("communication_learning_settings")
    .insert({ org_id: orgId, user_id: userId })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`Learning settings creation failed: ${error?.message}`);
  return data as LearningSettings;
}

export async function storeCommunicationExample({
  supabase,
  orgId,
  userId,
  content,
  subject = null,
  source,
  sourceMessageId = null,
  channel = "email",
  leadId = null,
  conversationId = null,
  situation,
  occurredAt,
  names = [],
  qualityScore = 0.75,
  metadata = {},
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  content: string;
  subject?: string | null;
  source: CommunicationSource;
  sourceMessageId?: string | null;
  channel?: string;
  leadId?: string | null;
  conversationId?: string | null;
  situation?: string;
  occurredAt?: string;
  names?: Array<string | null | undefined>;
  qualityScore?: number;
  metadata?: JsonRecord;
}) {
  const sanitised = sanitiseCommunicationText(content, { names });
  if ((sanitised.match(/[\p{L}\p{N}]+/gu)?.length || 0) < 4) return null;
  const sanitisedSubject = subject
    ? sanitiseCommunicationText(subject, { names }).slice(0, 300)
    : null;
  const resolvedSituation =
    situation || classifyCommunicationSituation(subject || "", content);
  const [embedding] = await embedKnowledge([
    `${resolvedSituation}\n${sanitisedSubject || ""}\n${sanitised}`,
  ]);
  const contentHash = createHash("sha256")
    .update(`${userId}\u0000${resolvedSituation}\u0000${sanitised}`)
    .digest("hex");
  const now = new Date().toISOString();
  const payload = {
    org_id: orgId,
    user_id: userId,
    lead_id: leadId,
    conversation_id: conversationId,
    source_message_id: sourceMessageId,
    source,
    channel,
    situation: resolvedSituation,
    subject: sanitisedSubject,
    content: sanitised,
    content_hash: contentHash,
    embedding,
    embedding_model: KNOWLEDGE_EMBEDDING_MODEL,
    quality_score: qualityScore,
    approved: true,
    excluded: false,
    metadata: {
      ...metadata,
      sanitised: true,
      raw_retained: false,
    },
    occurred_at: occurredAt || now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("communication_examples")
    .upsert(payload, { onConflict: "org_id,user_id,content_hash" })
    .select("id,content,situation,source,occurred_at")
    .single();
  if (error)
    throw new Error(`Communication example storage failed: ${error.message}`);
  return data;
}

export async function refreshAgentVoiceProfile(
  supabase: SupabaseLike,
  orgId: string,
  userId: string,
) {
  const [
    { data: examples, error: examplesError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    supabase
      .from("communication_examples")
      .select("content")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("approved", true)
      .eq("excluded", false)
      .order("occurred_at", { ascending: false })
      .limit(STYLE_SAMPLE_LIMIT),
    supabase
      .from("communication_learning_events")
      .select("event_type,guidance_text")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .in("event_type", ["explicit_rule", "never_say"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (examplesError)
    throw new Error(`Style example lookup failed: ${examplesError.message}`);
  if (eventsError)
    throw new Error(`Style rule lookup failed: ${eventsError.message}`);

  const explicitRules = (events || [])
    .filter((event: JsonRecord) => event.event_type === "explicit_rule")
    .map((event: JsonRecord) => String(event.guidance_text || "").trim())
    .filter(Boolean);
  const avoidPhrases = (events || [])
    .filter((event: JsonRecord) => event.event_type === "never_say")
    .map((event: JsonRecord) => String(event.guidance_text || "").trim())
    .filter(Boolean);
  const profile = deriveAgentStyleProfile(
    (examples || []).map((example: JsonRecord) =>
      String(example.content || ""),
    ),
    explicitRules,
  );
  const now = new Date().toISOString();
  const { error } = await supabase.from("agent_profiles").upsert(
    {
      org_id: orgId,
      user_id: userId,
      common_greetings: profile.greetings,
      common_signoffs: profile.signoffs,
      style_summary: profile.summary,
      style_rules: profile.rules,
      avoid_phrases: avoidPhrases,
      average_message_words: profile.averageWords,
      learned_sample_count: profile.sampleCount,
      confidence_score: profile.confidence,
      status: profile.sampleCount >= 10 ? "active" : "learning",
      last_trained_at: now,
      last_learned_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error)
    throw new Error(`Agent voice profile refresh failed: ${error.message}`);
  return profile;
}

export async function recordApprovedCommunication({
  supabase,
  orgId,
  userId,
  finalText,
  originalText,
  subject,
  channel,
  leadId,
  conversationId,
  sourceMessageId,
  names,
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  finalText: string;
  originalText?: string | null;
  subject?: string | null;
  channel: string;
  leadId?: string | null;
  conversationId?: string | null;
  sourceMessageId?: string | null;
  names?: Array<string | null | undefined>;
}) {
  const settings = await getLearningSettings(supabase, orgId, userId);
  if (!settings?.learning_enabled || !settings.learn_from_approved) {
    return { learned: false as const, reason: "disabled" as const };
  }
  if (settings.excluded_channels.includes(channel)) {
    return { learned: false as const, reason: "excluded_channel" as const };
  }
  const changed = Boolean(
    originalText &&
    normaliseWhitespace(originalText) !== normaliseWhitespace(finalText),
  );
  const sanitisedOriginal = originalText
    ? sanitiseCommunicationText(originalText, { names })
    : null;
  const sanitisedFinal = sanitiseCommunicationText(finalText, { names });
  const situation = classifyCommunicationSituation(subject || "", finalText);
  let eventId: string | null = null;
  if (!changed || settings.learn_from_corrections) {
    const { data: event, error: eventError } = await supabase
      .from("communication_learning_events")
      .insert({
        org_id: orgId,
        user_id: userId,
        lead_id: leadId || null,
        conversation_id: conversationId || null,
        event_type: changed ? "edited" : "approved",
        feedback_code: changed ? "agent_rewrite" : "approved_unchanged",
        original_text: sanitisedOriginal,
        final_text: sanitisedFinal,
        applied_scope: "situation",
        metadata: { situation, channel, sanitised: true, raw_retained: false },
      })
      .select("id")
      .single();
    if (eventError)
      throw new Error(`Learning event storage failed: ${eventError.message}`);
    eventId = event.id;
  }
  const example = await storeCommunicationExample({
    supabase,
    orgId,
    userId,
    content: finalText,
    subject,
    source: changed ? "agent_edit" : "approved_draft",
    sourceMessageId,
    channel,
    leadId,
    conversationId,
    situation,
    names,
    qualityScore: changed ? 1 : 0.9,
    metadata: { learning_event_id: eventId },
  });
  const profile = await refreshAgentVoiceProfile(supabase, orgId, userId);
  return { learned: Boolean(example), changed, profile };
}

export async function addAgentGuidance({
  supabase,
  orgId,
  userId,
  guidance,
  neverSay = false,
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  guidance: string;
  neverSay?: boolean;
}) {
  const clean = normaliseWhitespace(guidance).slice(0, 500);
  if (clean.length < 2) throw new Error("Guidance is too short");
  const { error } = await supabase
    .from("communication_learning_events")
    .insert({
      org_id: orgId,
      user_id: userId,
      event_type: neverSay ? "never_say" : "explicit_rule",
      guidance_text: clean,
      applied_scope: "agent",
      metadata: { explicit_user_instruction: true },
    });
  if (error) throw new Error(`Agent guidance storage failed: ${error.message}`);
  return refreshAgentVoiceProfile(supabase, orgId, userId);
}

export async function recordRejectedCommunication({
  supabase,
  orgId,
  userId,
  content,
  leadId,
  conversationId,
  channel,
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  content: string;
  leadId?: string | null;
  conversationId?: string | null;
  channel?: string;
}) {
  const settings = await getLearningSettings(supabase, orgId, userId);
  if (!settings?.learning_enabled || !settings.learn_from_corrections) {
    return false;
  }
  const { error } = await supabase
    .from("communication_learning_events")
    .insert({
      org_id: orgId,
      user_id: userId,
      lead_id: leadId || null,
      conversation_id: conversationId || null,
      event_type: "rejected",
      feedback_code: "draft_rejected",
      original_text: sanitiseCommunicationText(content),
      applied_scope: "situation",
      metadata: {
        situation: classifyCommunicationSituation("", content),
        channel: channel || "unknown",
        sanitised: true,
        raw_retained: false,
      },
    });
  if (error)
    throw new Error(`Draft rejection learning failed: ${error.message}`);
  return true;
}

export async function learnClientPreferenceEvidence({
  supabase,
  orgId,
  userId,
  leadId,
  conversationId,
  content,
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  leadId: string;
  conversationId?: string | null;
  content: string;
}) {
  const inferred = inferClientCommunicationPreferences(content);
  const hasEvidence = Boolean(
    inferred.channel ||
    inferred.length ||
    inferred.tone ||
    inferred.reminders ||
    inferred.language,
  );
  if (!hasEvidence) return null;
  const settings = await getLearningSettings(supabase, orgId, userId);
  if (!settings?.learning_enabled || !settings.learn_client_preferences)
    return null;

  const { data: existing, error: existingError } = await supabase
    .from("client_memories")
    .select(
      "id,locked_preferences,communication_signals,preference_evidence_count,learning_excluded",
    )
    .eq("org_id", orgId)
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existingError)
    throw new Error(
      `Client preference lookup failed: ${existingError.message}`,
    );
  if (existing?.learning_excluded) return null;
  const locked = record(existing?.locked_preferences);
  const signals = record(existing?.communication_signals);
  const now = new Date().toISOString();
  const patch: JsonRecord = {
    org_id: orgId,
    lead_id: leadId,
    preference_confidence: inferred.confidence,
    preference_evidence_count:
      Number(existing?.preference_evidence_count || 0) + 1,
    last_preference_evidence_at: now,
    last_updated_by: "adaptive_learning",
    updated_at: now,
  };
  const signalUpdates: JsonRecord = { ...signals };
  const fields: Array<[keyof typeof inferred, string, string]> = [
    ["channel", "communication_preference", "channel"],
    ["length", "length_preference", "length"],
    ["tone", "tone_preference", "tone"],
    ["reminders", "reminder_preference", "reminders"],
    ["language", "language_preference", "language"],
  ];
  fields.forEach(([sourceKey, column, lockKey]) => {
    const value = inferred[sourceKey];
    if (typeof value === "string" && locked[lockKey] !== true) {
      patch[column] = value;
      const current = record(signalUpdates[lockKey]);
      signalUpdates[lockKey] = {
        value,
        evidence_count: Number(current.evidence_count || 0) + 1,
        last_seen_at: now,
      };
    }
  });
  patch.communication_signals = signalUpdates;
  const query = existing?.id
    ? supabase.from("client_memories").update(patch).eq("id", existing.id)
    : supabase.from("client_memories").insert(patch);
  const { data, error } = await query.select("*").single();
  if (error)
    throw new Error(`Client preference update failed: ${error.message}`);
  await supabase.from("communication_learning_events").insert({
    org_id: orgId,
    user_id: userId,
    lead_id: leadId,
    conversation_id: conversationId || null,
    event_type: "client_preference_updated",
    applied_scope: "client",
    metadata: {
      fields: fields
        .filter(([sourceKey]) => typeof inferred[sourceKey] === "string")
        .map(([, , lockKey]) => lockKey),
      confidence: inferred.confidence,
      raw_retained: false,
    },
  });
  return data;
}

function relatedConversation(value: unknown) {
  if (Array.isArray(value)) return record(value[0]);
  return record(value);
}

export async function learnFromStoredMessages(
  supabase: SupabaseLike,
  orgId: string,
  userId: string,
) {
  const settings = await getLearningSettings(supabase, orgId, userId);
  if (!settings?.learning_enabled)
    return { processed: 0, learned: 0, preferences: 0 };
  const retentionCutoff = new Date(
    Date.now() - settings.retention_days * 24 * 60 * 60 * 1000,
  ).toISOString();
  await Promise.all([
    supabase
      .from("communication_examples")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .lt("occurred_at", retentionCutoff),
    supabase
      .from("communication_learning_events")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .lt("created_at", retentionCutoff),
  ]);
  let request = supabase
    .from("messages")
    .select(
      "id,direction_in_out,text,created_at,raw_json,conversations!inner(id,org_id,lead_id,channel)",
    )
    .eq("conversations.org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(MESSAGE_SCAN_LIMIT);
  if (settings.last_message_scan_at) {
    request = request.gt("created_at", settings.last_message_scan_at);
  }
  const { data: messages, error } = await request;
  if (error)
    throw new Error(`Communication history scan failed: ${error.message}`);
  let learned = 0;
  let preferences = 0;
  for (const message of messages || []) {
    const conversation = relatedConversation(message.conversations);
    const channel = String(conversation.channel || "unknown");
    if (settings.excluded_channels.includes(channel)) continue;
    const text = String(message.text || "").trim();
    if (!text) continue;
    const leadId =
      typeof conversation.lead_id === "string" ? conversation.lead_id : null;
    if (message.direction_in_out === "in" && leadId) {
      const result = await learnClientPreferenceEvidence({
        supabase,
        orgId,
        userId,
        leadId,
        conversationId: String(conversation.id || "") || null,
        content: text,
      });
      if (result) preferences += 1;
      continue;
    }
    if (message.direction_in_out !== "out" || !settings.learn_from_approved)
      continue;
    const raw = record(message.raw_json);
    const approved = Boolean(
      raw.approval_id || raw.automation_approval_id || raw.approved === true,
    );
    const clearlyHuman =
      raw.auto_generated !== true && raw.source !== "automation";
    if (!approved && !clearlyHuman) continue;
    const stored = await storeCommunicationExample({
      supabase,
      orgId,
      userId,
      content: text,
      subject: typeof raw.subject === "string" ? raw.subject : null,
      source: "outbound_message",
      sourceMessageId: String(message.id),
      channel,
      leadId,
      conversationId: String(conversation.id || "") || null,
      occurredAt: String(message.created_at),
      qualityScore: approved ? 0.85 : 0.65,
    });
    if (stored) learned += 1;
  }
  if (messages?.length) {
    const lastScan = String(messages[messages.length - 1].created_at);
    await supabase
      .from("communication_learning_settings")
      .update({
        last_message_scan_at: lastScan,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("user_id", userId);
  }
  if (learned > 0) await refreshAgentVoiceProfile(supabase, orgId, userId);
  return { processed: messages?.length || 0, learned, preferences };
}

function preferenceLines(memory: JsonRecord | null) {
  if (!memory || memory.learning_excluded === true) return [];
  const entries: Array<[string, unknown]> = [
    ["Preferred channel", memory.communication_preference],
    ["Preferred tone", memory.tone_preference],
    ["Preferred length", memory.length_preference],
    ["Preferred language", memory.language_preference],
    ["Reminder preference", memory.reminder_preference],
    ["Best contact time", memory.best_contact_time],
  ];
  return entries
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && Boolean(entry[1].trim()),
    )
    .map(([label, value]) => `${label}: ${value}`);
}

export async function retrieveAdaptiveCommunicationContext({
  supabase,
  orgId,
  userId,
  query,
  leadId,
  channel = "email",
}: {
  supabase: SupabaseLike;
  orgId: string;
  userId: string;
  query: string;
  leadId?: string | null;
  channel?: string;
}): Promise<AdaptiveContext> {
  const settings = await getLearningSettings(supabase, orgId, userId);
  const situation = classifyCommunicationSituation("", query);
  const empty: AdaptiveContext = {
    enabled: false,
    prompt: "",
    explanation: {
      profileConfidence: 0,
      sampleCount: 0,
      examplesUsed: 0,
      situation,
      clientPreferences: [],
      lastLearnedAt: null,
    },
  };
  if (
    !settings?.learning_enabled ||
    settings.automation_level === "observe" ||
    settings.excluded_channels.includes(channel)
  ) {
    return empty;
  }

  const [profileResult, memoryResult, examplesResult] = await Promise.all([
    supabase
      .from("agent_profiles")
      .select(
        "style_summary,style_rules,avoid_phrases,common_greetings,common_signoffs,average_message_words,learned_sample_count,confidence_score,last_learned_at",
      )
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle(),
    leadId
      ? supabase
          .from("client_memories")
          .select(
            "communication_preference,tone_preference,length_preference,language_preference,reminder_preference,best_contact_time,learning_excluded",
          )
          .eq("org_id", orgId)
          .eq("lead_id", leadId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("communication_examples")
      .select("content,subject,situation,embedding,quality_score,occurred_at")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("approved", true)
      .eq("excluded", false)
      .order("occurred_at", { ascending: false })
      .limit(RETRIEVAL_CANDIDATE_LIMIT),
  ]);
  if (profileResult.error)
    throw new Error(`Agent DNA lookup failed: ${profileResult.error.message}`);
  if (memoryResult.error)
    throw new Error(
      `Client preference lookup failed: ${memoryResult.error.message}`,
    );
  if (examplesResult.error)
    throw new Error(
      `Voice example lookup failed: ${examplesResult.error.message}`,
    );

  const profile = record(profileResult.data);
  const clientPreferences = preferenceLines(record(memoryResult.data));
  const [queryEmbedding] = await embedKnowledge([`${situation}\n${query}`]);
  const ranked: string[] = (examplesResult.data || [])
    .map((example: JsonRecord) => {
      const embedding = Array.isArray(example.embedding)
        ? (example.embedding as number[])
        : [];
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      const situationBoost = example.situation === situation ? 0.18 : 0;
      return {
        example,
        score:
          similarity +
          situationBoost +
          Number(example.quality_score || 0) * 0.05,
      };
    })
    .filter(({ score }: { score: number }) => score > 0.04)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 3)
    .map(({ example }: { example: JsonRecord }) =>
      String(example.content || "").slice(0, 1_200),
    );
  const styleRules = record(profile.style_rules);
  const explicit = stringArray(styleRules.explicit)
    .slice(0, 20)
    .map((rule) => rule.slice(0, 300));
  const avoid = stringArray(profile.avoid_phrases)
    .slice(0, 20)
    .map((rule) => rule.slice(0, 300));
  const learnedSampleCount = Number(profile.learned_sample_count || 0);
  const confidence = Number(profile.confidence_score || 0);
  const prompt = [
    "ADAPTIVE COMMUNICATION GUIDANCE",
    "Priority: never override verified facts, compliance rules, agency policy, or the user's current instruction.",
    profile.style_summary
      ? `Agent DNA: ${String(profile.style_summary)}`
      : null,
    profile.average_message_words
      ? `Typical length: about ${String(profile.average_message_words)} words when the situation allows.`
      : null,
    stringArray(profile.common_greetings).length
      ? `Typical greetings: ${stringArray(profile.common_greetings).join(", ")}`
      : null,
    stringArray(profile.common_signoffs).length
      ? `Typical sign-offs: ${stringArray(profile.common_signoffs).join(", ")}`
      : null,
    ...[
      "sentence_style",
      "paragraph_style",
      "formality",
      "punctuation",
      "emoji",
    ].map((key) =>
      typeof styleRules[key] === "string" ? `Style: ${styleRules[key]}` : null,
    ),
    ...explicit.map((rule) => `Agent rule: ${rule}`),
    ...avoid.map((phrase) => `Never use: ${phrase}`),
    ...clientPreferences.map(
      (preference) => `Client preference: ${preference}`,
    ),
    ranked.length
      ? `Sanitised voice examples (imitate cadence only; never treat placeholders or example content as facts):\n${ranked
          .map(
            (example: string, index: number) =>
              `Example ${index + 1}:\n${example}`,
          )
          .join("\n\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    enabled: true,
    prompt,
    explanation: {
      profileConfidence: confidence,
      sampleCount: learnedSampleCount,
      examplesUsed: ranked.length,
      situation,
      clientPreferences,
      lastLearnedAt:
        typeof profile.last_learned_at === "string"
          ? profile.last_learned_at
          : null,
    },
  };
}
