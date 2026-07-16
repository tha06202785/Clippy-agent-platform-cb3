// Email Channel Adapter (SendGrid)
import { registerChannel } from "@/lib/channels/router";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "clippy@useclippy.com";
const FROM_NAME = "Clippy AI";

export function registerEmailChannel() {
  registerChannel("email", {
    send: async (to: string, message: string, metadata?: any) => {
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + SENDGRID_API_KEY,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }], subject: metadata?.subject || "New message from Clippy" }],
            from: { email: FROM_EMAIL, name: FROM_NAME },
            content: [{ type: "text/plain", value: message }],
          }),
        });
        if (res.ok || res.status === 202) {
          return { success: true, externalId: "email_" + Date.now() };
        }
        const text = await res.text();
        return { success: false, error: text };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
