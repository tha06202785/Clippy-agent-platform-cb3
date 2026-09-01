type DatabaseClient = any;

export function normaliseReceiptTime(value?: string | number | null) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (Number.isFinite(numeric) && numeric > 0) {
    // Meta sends Messenger delivery/read watermarks in milliseconds, while
    // some webhook providers use Unix seconds. Multiplying an already-ms
    // value produced impossible years and caused Postgres 22009 failures.
    const milliseconds =
      numeric >= 1_000_000_000_000 ? numeric : numeric * 1000;
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export async function updateDeliveryStatus({
  supabase,
  orgId,
  externalMessageId,
  status,
  timestamp,
  error,
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

  const raw =
    message.raw_json && typeof message.raw_json === "object"
      ? message.raw_json
      : {};
  const { error: updateError } = await supabase
    .from("messages")
    .update({
      raw_json: {
        ...raw,
        delivery_status: status,
        delivery_updated_at: normaliseReceiptTime(timestamp),
        delivery_error: error || null,
      },
    })
    .eq("id", message.id)
    .eq("org_id", orgId);
  if (updateError) throw updateError;
  return true;
}

export async function markConversationRead({
  supabase,
  orgId,
  channel,
  externalThreadId,
  watermark,
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

  const readAt = normaliseReceiptTime(watermark);
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

  await Promise.all(
    (messages || []).map(
      (message: {
        id: string;
        raw_json: Record<string, unknown> | null;
        created_at: string;
      }) => {
        const raw =
          message.raw_json && typeof message.raw_json === "object"
            ? message.raw_json
            : {};
        return supabase
          .from("messages")
          .update({
            raw_json: {
              ...raw,
              delivery_status: "read",
              delivery_updated_at: readAt,
              delivery_error: null,
            },
          })
          .eq("id", message.id)
          .eq("org_id", orgId);
      },
    ),
  );
  return messages?.length || 0;
}
