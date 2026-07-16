// Channel Router - unified delivery service for all channels
// Every channel adapter calls this to send replies back to customers

const CHANNEL_CONFIGS: Record<string, { send: (to: string, message: string, metadata?: any) => Promise<{ success: boolean; externalId?: string; error?: string }> }> = {};

// Register a channel handler
export function registerChannel(name: string, handler: { send: (to: string, message: string, metadata?: any) => Promise<{ success: boolean; externalId?: string; error?: string }> }) {
  CHANNEL_CONFIGS[name] = handler;
}

// Send a message through the appropriate channel
export async function sendMessage(
  channel: string,
  to: string,
  message: string,
  metadata?: { externalConversationId?: string; leadId?: string; conversationId?: string; orgId?: string }
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const handler = CHANNEL_CONFIGS[channel];
  if (!handler) {
    console.error("No handler registered for channel:", channel);
    return { success: false, error: "No handler for channel: " + channel };
  }
  return handler.send(to, message, metadata);
}

// Track delivery attempt in database
export async function trackDelivery(supabase: any, result: { success: boolean; externalId?: string; error?: string }, channel: string, conversationId: string, orgId: string) {
  await supabase.from("message_delivery_attempts").insert({
    org_id: orgId,
    channel: channel,
    status: result.success ? "sent" : "failed",
    attempt_count: 1,
    idempotency_key: "del_" + conversationId + "_" + Date.now(),
    last_error: result.error || null,
    delivered_at: result.success ? new Date().toISOString() : null,
  });
}
