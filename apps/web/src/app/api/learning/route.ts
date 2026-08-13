import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addAgentGuidance,
  ensureLearningSettings,
  learnFromStoredMessages,
  refreshAgentVoiceProfile,
} from "@/lib/adaptive-learning";
import { syncGoogleKnowledge } from "@/lib/integrations/google-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const settingsSchema = z
  .object({
    learning_enabled: z.boolean().optional(),
    learn_from_sent: z.boolean().optional(),
    learn_from_approved: z.boolean().optional(),
    learn_from_corrections: z.boolean().optional(),
    learn_client_preferences: z.boolean().optional(),
    automation_level: z
      .enum(["observe", "assist", "draft", "trusted"])
      .optional(),
    excluded_channels: z
      .array(z.enum(["email", "sms", "whatsapp", "facebook", "copy"]))
      .max(5)
      .optional(),
  })
  .strict();

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("guidance"),
    guidance: z.string().trim().min(2).max(500),
    never_say: z.boolean().optional(),
  }),
  z.object({ action: z.literal("sync") }),
  z.object({ action: z.literal("rebuild_profile") }),
  z.object({
    action: z.literal("exclude_example"),
    example_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("include_example"),
    example_id: z.string().uuid(),
  }),
  z.object({ action: z.literal("reset") }),
]);

async function userContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const { data: membership, error } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (error || !membership?.org_id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "No organisation is linked to this account." },
        { status: 409 },
      ),
    };
  }
  return { ok: true as const, supabase, user, orgId: membership.org_id };
}

export async function GET() {
  try {
    const context = await userContext();
    if (!context.ok) return context.response;
    const { supabase, user, orgId } = context;
    // Integration credentials and diagnostic fields stay server-only. The
    // user membership above authorises this narrow organisation-scoped read.
    const admin = createAdminClient();
    const settings = await ensureLearningSettings(supabase, orgId, user.id);
    const [
      profileResult,
      examplesResult,
      eventsResult,
      clientsResult,
      gmailResult,
    ] = await Promise.all([
      supabase
        .from("agent_profiles")
        .select(
          "style_summary,style_rules,avoid_phrases,common_greetings,common_signoffs,communication_tone,average_message_words,learned_sample_count,confidence_score,status,last_learned_at",
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("communication_examples")
        .select(
          "id,source,channel,situation,subject,content,quality_score,excluded,occurred_at",
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("communication_learning_events")
        .select(
          "id,event_type,feedback_code,guidance_text,applied_scope,metadata,created_at",
        )
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("client_memories")
        .select(
          "id,lead_id,communication_preference,tone_preference,length_preference,language_preference,reminder_preference,preference_confidence,preference_evidence_count,last_preference_evidence_at,learning_excluded",
        )
        .eq("org_id", orgId)
        .gt("preference_evidence_count", 0)
        .order("last_preference_evidence_at", { ascending: false })
        .limit(50),
      admin
        .from("integrations")
        .select("status,last_sync_at,last_error")
        .eq("org_id", orgId)
        .eq("provider", "gmail")
        .maybeSingle(),
    ]);
    const queryError =
      profileResult.error ||
      examplesResult.error ||
      eventsResult.error ||
      clientsResult.error ||
      gmailResult.error;
    if (queryError) throw queryError;
    const clientRows = clientsResult.data || [];
    const leadIds = clientRows.map((client) => client.lead_id).filter(Boolean);
    const { data: leads, error: leadsError } = leadIds.length
      ? await supabase
          .from("leads")
          .select("id,full_name")
          .eq("org_id", orgId)
          .in("id", leadIds)
      : { data: [], error: null };
    if (leadsError) throw leadsError;
    const names = new Map(
      (leads || []).map((lead) => [lead.id, lead.full_name]),
    );
    const clients = clientRows.map((client) => ({
      ...client,
      client_name: names.get(client.lead_id) || "Client",
    }));
    const examples = examplesResult.data || [];
    const events = eventsResult.data || [];
    const sources = examples.reduce<Record<string, number>>(
      (counts, example) => {
        counts[example.source] = (counts[example.source] || 0) + 1;
        return counts;
      },
      {},
    );
    return NextResponse.json({
      settings,
      profile: profileResult.data,
      examples,
      events,
      clients,
      gmail: gmailResult.data,
      stats: {
        examples: examples.filter((example) => !example.excluded).length,
        excluded: examples.filter((example) => example.excluded).length,
        approved: events.filter((event) => event.event_type === "approved")
          .length,
        edited: events.filter((event) => event.event_type === "edited").length,
        rejected: events.filter((event) => event.event_type === "rejected")
          .length,
        client_preferences: clientsResult.data?.length || 0,
        sources,
      },
      privacy: {
        raw_examples_retained: false,
        note: "Voice examples are sanitised before storage and private to the signed-in agent.",
      },
    });
  } catch (error) {
    console.error("Learning Centre load failed", error);
    return NextResponse.json(
      { error: "Clippy could not load Adaptive Intelligence." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await userContext();
    if (!context.ok) return context.response;
    const parsed = settingsSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Invalid learning settings",
        },
        { status: 400 },
      );
    }
    const { supabase, user, orgId } = context;
    await ensureLearningSettings(supabase, orgId, user.id);
    const { data, error } = await supabase
      .from("communication_learning_settings")
      .update({
        ...parsed.data,
        // Raw correspondence is intentionally never retained as a style sample.
        retain_raw_examples: false,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Learning settings update failed", error);
    return NextResponse.json(
      { error: "Clippy could not update learning settings." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await userContext();
    if (!context.ok) return context.response;
    const parsed = actionSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid learning action" },
        { status: 400 },
      );
    }
    const { supabase, user, orgId } = context;
    const admin = createAdminClient();
    await ensureLearningSettings(supabase, orgId, user.id);

    if (parsed.data.action === "guidance") {
      const profile = await addAgentGuidance({
        supabase,
        orgId,
        userId: user.id,
        guidance: parsed.data.guidance,
        neverSay: parsed.data.never_say,
      });
      return NextResponse.json({ profile });
    }

    if (parsed.data.action === "rebuild_profile") {
      const profile = await refreshAgentVoiceProfile(supabase, orgId, user.id);
      return NextResponse.json({ profile });
    }

    if (
      parsed.data.action === "exclude_example" ||
      parsed.data.action === "include_example"
    ) {
      const excluded = parsed.data.action === "exclude_example";
      const { data, error } = await supabase
        .from("communication_examples")
        .update({ excluded, updated_at: new Date().toISOString() })
        .eq("id", parsed.data.example_id)
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .select("id,excluded")
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json(
          { error: "Voice example not found" },
          { status: 404 },
        );
      }
      await supabase.from("communication_learning_events").insert({
        org_id: orgId,
        user_id: user.id,
        example_id: data.id,
        event_type: "example_excluded",
        applied_scope: "agent",
        metadata: { excluded },
      });
      const profile = await refreshAgentVoiceProfile(supabase, orgId, user.id);
      return NextResponse.json({ example: data, profile });
    }

    if (parsed.data.action === "reset") {
      const [{ error: eventsError }, { error: examplesError }] =
        await Promise.all([
          supabase
            .from("communication_learning_events")
            .delete()
            .eq("org_id", orgId)
            .eq("user_id", user.id),
          supabase
            .from("communication_examples")
            .delete()
            .eq("org_id", orgId)
            .eq("user_id", user.id),
        ]);
      if (eventsError || examplesError) throw eventsError || examplesError;
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from("agent_profiles")
          .update({
            style_summary: null,
            style_rules: {},
            avoid_phrases: [],
            common_greetings: [],
            common_signoffs: [],
            average_message_words: null,
            learned_sample_count: 0,
            confidence_score: 35,
            status: "learning",
            last_learned_at: null,
            updated_at: now,
          })
          .eq("org_id", orgId)
          .eq("user_id", user.id),
        supabase
          .from("communication_learning_settings")
          .update({
            last_message_scan_at: null,
            last_sent_sync_at: null,
            sent_page_token: null,
            sent_backfill_complete: false,
            updated_at: now,
          })
          .eq("org_id", orgId)
          .eq("user_id", user.id),
      ]);
      return NextResponse.json({ reset: true });
    }

    const { data: gmail } = await admin
      .from("integrations")
      .select("id")
      .eq("org_id", orgId)
      .eq("provider", "gmail")
      .eq("status", "connected")
      .maybeSingle();
    const result = gmail
      ? await syncGoogleKnowledge(orgId, user.id)
      : await learnFromStoredMessages(admin, orgId, user.id);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Learning action failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Clippy could not complete the learning action.",
      },
      { status: 500 },
    );
  }
}
