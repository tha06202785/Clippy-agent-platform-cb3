// Facebook Channel Adapter
import { registerChannel } from "@/lib/channels/router";

const FB_GRAPH_URL = "https://graph.facebook.com/v18.0";
const FB_PAGE_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || "";

export function registerFacebookChannel() {
  registerChannel("facebook", {
    send: async (to: string, message: string, metadata?: any) => {
      try {
        // Send via Facebook Graph API Send API
        const url = FB_GRAPH_URL + "/me/messages?access_token=" + FB_PAGE_TOKEN;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: to },
            message: { text: message },
            messaging_type: "RESPONSE",
          }),
        });
        const data = await res.json();
        if (data.message_id) {
          return { success: true, externalId: data.message_id };
        }
        return { success: false, error: data.error?.message || "Facebook send failed" };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
