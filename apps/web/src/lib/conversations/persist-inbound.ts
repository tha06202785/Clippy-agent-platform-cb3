type DatabaseClient = any;

export async function persistInboundMessage({
  supabase,
  orgId,
  leadId,
  channel,
  externalThreadId,
  externalMessageId,
  text,
  rawPayload,
}: {
  supabase: DatabaseClient;
  orgId: string;
  leadId: string;
  channel: string;
  externalThreadId: string;
  externalMessageId?: string | null;
  text: string;
  rawPayload?: unknown;
}) {
  if (externalMessageId) {
    const { data: existing, error } = await supabase
      .from("messages")
      .select("id,conversation_id")
      .eq("org_id", orgId)
      .contains("raw_json", { external_message_id: externalMessageId })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing) {
      return { conversationId: existing.conversation_id, duplicate: true };
    }
  }

  let { data: conversation, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("org_id", orgId)
    .eq("channel", channel)
    .eq("external_thread_id", externalThreadId)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const now = new Date().toISOString();
  if (!conversation) {
    const created = await supabase
      .from("conversations")
      .insert({
        org_id: orgId,
        lead_id: leadId,
        channel,
        external_thread_id: externalThreadId,
        last_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      throw created.error || new Error("Could not create conversation");
    }
    conversation = created.data;
  }

  const { error: messageError } = await supabase.from("messages").insert({
    org_id: orgId,
    conversation_id: conversation.id,
    direction_in_out: "in",
    text,
    read_at: null,
    raw_json: {
      channel,
      external_message_id: externalMessageId || null,
      external_thread_id: externalThreadId,
      payload: rawPayload || null,
    },
  });
  if (messageError) throw messageError;

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", conversation.id)
    .eq("org_id", orgId);
  if (updateError) throw updateError;

  return { conversationId: conversation.id, duplicate: false };
}
