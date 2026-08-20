import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordClippyActivity } from "@/lib/activity-log";
import {
  deleteMessageRaw,
  editMessageRaw,
  hideMessageRaw,
  isMessageDeleted,
  restoreMessageRaw,
} from "@/lib/conversations/message-visibility";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    text: z.string().trim().min(1).max(12_000),
  }),
  z.object({ action: z.literal("hide") }),
  z.object({ action: z.literal("unhide") }),
  z.object({ action: z.literal("delete") }),
]);

async function archiveDerivedKnowledge(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  messageId: string,
  externalMessageId?: string | null,
) {
  const sourceIds = [messageId, externalMessageId].filter(
    (value): value is string => Boolean(value),
  );
  await Promise.all([
    externalMessageId
      ? admin
          .from("knowledge_documents")
          .update({
            status: "archived",
            health: "disabled",
            updated_at: new Date().toISOString(),
          })
          .eq("org_id", orgId)
          .eq("source", "email")
          .eq("external_id", externalMessageId)
      : Promise.resolve({ error: null }),
    sourceIds.length
      ? admin
          .from("communication_examples")
          .update({ excluded: true, updated_at: new Date().toISOString() })
          .eq("org_id", orgId)
          .in("source_message_id", sourceIds)
      : Promise.resolve({ error: null }),
  ]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const { id, messageId } = await params;
  if (
    !z.string().uuid().safeParse(id).success ||
    !z.string().uuid().safeParse(messageId).success
  ) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid message action" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("id,text,direction_in_out,raw_json,read_at")
    .eq("id", messageId)
    .eq("conversation_id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (messageError) throw messageError;
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (isMessageDeleted(message)) {
    return NextResponse.json(
      { error: "This message has already been deleted from Clippy" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  let rawJson = message.raw_json;
  let text = String(message.text || "");
  let readAt = message.read_at;
  if (parsed.data.action === "edit") {
    rawJson = editMessageRaw(message.raw_json, {
      at: now,
      userId: user.id,
      currentText: text,
    });
    text = parsed.data.text;
    await archiveDerivedKnowledge(
      admin,
      membership.org_id,
      message.id,
      typeof rawJson.external_message_id === "string"
        ? rawJson.external_message_id
        : null,
    );
  } else if (parsed.data.action === "hide") {
    rawJson = hideMessageRaw(message.raw_json, {
      at: now,
      userId: user.id,
      reason: "user_hidden",
    });
    readAt = readAt || now;
    await archiveDerivedKnowledge(
      admin,
      membership.org_id,
      message.id,
      typeof rawJson.external_message_id === "string"
        ? rawJson.external_message_id
        : null,
    );
  } else if (parsed.data.action === "unhide") {
    rawJson = restoreMessageRaw(message.raw_json);
  } else {
    rawJson = deleteMessageRaw(message.raw_json, {
      at: now,
      userId: user.id,
    });
    readAt = readAt || now;
    await archiveDerivedKnowledge(
      admin,
      membership.org_id,
      message.id,
      typeof rawJson.external_message_id === "string"
        ? rawJson.external_message_id
        : null,
    );
  }

  if (parsed.data.action === "hide" || parsed.data.action === "delete") {
    await Promise.all([
      admin
        .from("automation_approvals")
        .update({
          status: "expired",
          reason: "Source message was removed from Clippy AI context",
          updated_at: now,
        })
        .eq("org_id", membership.org_id)
        .eq("conversation_id", id)
        .eq("status", "pending"),
      admin
        .from("scheduled_communications")
        .update({
          status: "cancelled",
          cancelled_at: now,
          updated_at: now,
          last_error: "Source message was removed from Clippy AI context",
        })
        .eq("org_id", membership.org_id)
        .eq("conversation_id", id)
        .in("status", ["scheduled", "awaiting_approval"]),
    ]);
  }

  const { data: updated, error: updateError } = await admin
    .from("messages")
    .update({ text, raw_json: rawJson, read_at: readAt })
    .eq("id", message.id)
    .eq("org_id", membership.org_id)
    .select("id,direction_in_out,text,created_at,read_at,raw_json")
    .single();
  if (updateError || !updated) {
    throw updateError || new Error("Message update failed");
  }

  const actionPastTense = {
    edit: "edited",
    hide: "hidden",
    unhide: "restored",
    delete: "deleted",
  }[parsed.data.action];
  await recordClippyActivity(admin, {
    orgId: membership.org_id,
    userId: user.id,
    action: `conversation_message_${parsed.data.action}`,
    category: "communication",
    title: `Conversation message ${actionPastTense}`,
    description:
      parsed.data.action === "edit"
        ? "The Clippy copy was edited; the original external message was preserved in its audit metadata."
        : parsed.data.action === "delete"
          ? "The message was removed from Clippy and excluded from AI context."
          : "The message visibility was updated and its AI context was refreshed.",
    impactSummary: "Conversation context updated by the agent",
    metadata: {
      conversation_id: id,
      message_id: message.id,
      action: parsed.data.action,
    },
    completedAt: now,
  });

  return NextResponse.json({ status: parsed.data.action, message: updated });
}
