// WhatsApp Channel Adapter
import { registerChannel } from "@/lib/channels/router";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import { createAdminClient } from "@/lib/supabase/admin";

export function registerWhatsAppChannel() {
  registerChannel("whatsapp", {
    send: async (to: string, message: string, metadata?: any) => {
      try {
        if (!metadata?.orgId)
          throw new Error("WhatsApp delivery requires an agency");
        const result = await deliverApprovedMessage({
          admin: createAdminClient(),
          orgId: metadata.orgId,
          channel: "whatsapp",
          recipient: to,
          content: message,
        });
        return { success: true, externalId: result.externalId };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
