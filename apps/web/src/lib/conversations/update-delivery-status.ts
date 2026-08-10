type DatabaseClient = any;

function receiptTime(value?: string | number | null) {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return new Date(Number(value) * 1000).toISOString();
  }
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  return new Date().toISOString();
}

export async function updateDeliveryStatus({
  supabase, orgId, externalMessageId, status, timestamp, error,
}: {
  supabase: DatabaseClient;
  orgId: string;
  externalMessageId: string;
  status: string;
  timestamp?: string | number | null;
  error?: string | null;
}) {
  const { data: message, error: findError } = await supabase
    .from("messages")
    .select("id,raw_json")
    .eq("org_id", orgId)
    .contains("raw_json", { external_message_id: externalMessageId })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (!message) return false;

  const raw = message.raw_json && typeof message.raw_json === "object"
    ? message.raw_json
    : {};
  const { error: updateError } = await supabase
    .from("messages")
    .update({
      raw_json: {
        ...raw,
        delivery_status: status,
        delivery_updated_at: receiptTime(timestamp),
        delivery_error: error || null,
      },
    })
    .eq("id", message.id)
    .eq("org_id", orgId);
  if (updateError) throw updateError;
  return true;
}

export async function markConversationRead({
  supabase, orgId, channel, externalThreadId, watermark,
}: {
  supabase: DatabaseClient;
  orgId: string;
  channel: string;
  externalThreadId: string;
  watermark: string | number;
}) {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("org_id", orgId)
    .eq("channel", channel)
    .eq("external_thread_id", externalThreadId)
    .limit(1)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) return 0;

  const readAt = receiptTime(watermark);
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id,raw_json,created_at")
    .eq("org_id", orgId)
    .eq("conversation_id", conversation.id)
    .eq("direction_in_out", "out")
    .lte("created_at", readAt)
    .order("created_at", { ascending: false })
    .limit(50);
  if (messagesError) throw messagesError;

  await Promise.all((messages || []).map((message: {
    id: string;
    raw_json: Record<string, unknown> | null;
    created_at: string;
  }) => {
    const raw = message.raw_json && typeof message.raw_json === "object"
      ? message.raw_json
      : {};
    return supabase.from("messages").update({
      raw_json: {
        ...raw,
        delivery_status: "read",
        delivery_updated_at: readAt,
        delivery_error: null,
      },
    }).eq("id", message.id).eq("org_id", orgId);
  }));
  return messages?.length || 0;
}
