// WhatsApp Channel Adapter
import { registerChannel } from "@/lib/channels/router";

const FB_GRAPH_URL = "https://graph.facebook.com/v18.0";
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";

export function registerWhatsAppChannel() {
  registerChannel("whatsapp", {
    send: async (to: string, message: string, metadata?: any) => {
      try {
        const url = FB_GRAPH_URL + "/" + WA_PHONE_NUMBER_ID + "/messages";
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + WA_TOKEN,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: message },
          }),
        });
        const data = await res.json();
        if (data.messages?.[0]?.id) {
          return { success: true, externalId: data.messages[0].id };
        }
        return { success: false, error: data.error?.message || "WhatsApp send failed" };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
