import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize supabase only if credentials are available
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface FacebookWebhookPayload {
  entry: Array<{
    messaging: Array<{
      sender: {
        id: string;
      };
      message?: {
        text: string;
      };
    }>;
  }>;
}

interface EmailWebhookPayload {
  event: string;
  data: {
    from: string;
    to: string;
    subject: string;
    body: string;
    timestamp: string;
  };
}

/**
 * Facebook Webhook Handler
 * Captures leads from Facebook messages
 */
router.post("/webhooks/facebook", async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase is not configured" });
  }

  try {
    const payload: FacebookWebhookPayload = req.body;

    // Verify webhook token (in production, verify X-Hub-Signature)
    const token = req.query.hub_verify_token;
    const challenge = req.query.hub_challenge;

    if (token === process.env.FACEBOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    // Process incoming messages
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const event of entry.messaging) {
            if (event.message?.text) {
              // Extract lead information from message
              const leadName = extractNameFromMessage(event.message.text);
              const leadEmail = extractEmailFromMessage(event.message.text);

              if (leadName || leadEmail) {
                // Create lead in database
                const { error } = await supabase.from("leads").insert([
                  {
                    full_name: leadName || "Facebook Lead",
                    email: leadEmail || null,
                    source: "facebook",
                    status: "new",
                    interest_level: "medium",
                    notes: event.message.text,
                    // Note: You'll need to determine the actual user_id from your authentication
                    assigned_to_user_id: "default-user-id", // Replace with actual user ID
                  },
                ]);

                if (error) {
                  console.error("Error creating lead from Facebook:", error);
                }

                // Log the automation event
                await supabase.from("automation_logs").insert([
                  {
                    type: "lead_capture",
                    source: "facebook",
                    status: error ? "error" : "success",
                    message: error
                      ? `Failed to capture lead: ${error.message}`
                      : `New lead captured from Facebook: ${leadName || leadEmail}`,
                    user_id: "default-user-id", // Replace with actual user ID
                  },
                ]);
              }
            }
          }
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Facebook webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Email Webhook Handler
 * Captures leads from incoming emails
 */
router.post("/webhooks/email", async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase is not configured" });
  }

  try {
    const payload: EmailWebhookPayload = req.body;

    if (payload.event === "new_email") {
      const { from, to, subject, body, timestamp } = payload.data;

      // Extract lead information from email
      const leadName = extractNameFromEmail(from);
      const leadEmail = extractEmailFromText(from);

      if (leadName || leadEmail) {
        // Create lead in database
        const { error } = await supabase.from("leads").insert([
          {
            full_name: leadName || "Email Lead",
            email: leadEmail,
            source: "email",
            status: "new",
            interest_level: "medium",
            notes: `Subject: ${subject}\n\nBody: ${body.substring(0, 500)}`,
            // Note: You'll need to determine the actual user_id from your authentication
            assigned_to_user_id: "default-user-id", // Replace with actual user ID
          },
        ]);

        if (error) {
          console.error("Error creating lead from email:", error);
        }

        // Log the automation event
        await supabase.from("automation_logs").insert([
          {
            type: "lead_capture",
            source: "email",
            status: error ? "error" : "success",
            message: error
              ? `Failed to capture email lead: ${error.message}`
              : `New email lead captured: ${leadName} (${leadEmail})`,
            user_id: "default-user-id", // Replace with actual user ID
          },
        ]);

        // Create a task for follow-up
        if (!error) {
          await supabase.from("tasks").insert([
            {
              title: `Follow up with ${leadName || "email lead"}`,
              type: "follow_up_24h",
              description: `Follow up on inquiry about property. Email: ${leadEmail}`,
              due_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
              assigned_to_user_id: "default-user-id", // Replace with actual user ID
              status: "pending",
            },
          ]);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Email webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Generic Webhook Handler
 * For testing and debugging
 */
router.post("/webhooks/test", async (req: Request, res: Response) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase is not configured" });
  }

  try {
    const { type, leadName, leadEmail, source } = req.body;

    // Create lead
    const { data: leadData, error: leadError } = await supabase
      .from("leads")
      .insert([
        {
          full_name: leadName || `Test Lead from ${source}`,
          email: leadEmail || null,
          source: source || "webhook",
          status: "new",
          interest_level: "medium",
          notes: "Test lead created via webhook",
          assigned_to_user_id: "default-user-id",
        },
      ])
      .select();

    if (leadError) {
      return res.status(400).json({ error: leadError.message });
    }

    // Log the event
    await supabase.from("automation_logs").insert([
      {
        type: "lead_capture",
        source: source || "webhook",
        status: "success",
        message: `Test webhook received: ${leadName}`,
        user_id: "default-user-id",
      },
    ]);

    res.status(200).json({
      status: "success",
      lead: leadData?.[0],
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper functions
function extractNameFromMessage(text: string): string | null {
  const nameMatch = text.match(/(?:my name is|i'm|i am)\s+([a-zA-Z\s]+)/i);
  return nameMatch ? nameMatch[1].trim() : null;
}

function extractEmailFromMessage(text: string): string | null {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : null;
}

function extractNameFromEmail(emailOrName: string): string | null {
  // If it looks like an email, try to extract name from the local part
  if (emailOrName.includes("@")) {
    const localPart = emailOrName.split("@")[0];
    // Convert email.name -> Email Name
    return localPart
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return emailOrName || null;
}

function extractEmailFromText(text: string): string | null {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : text;
}

export default router;
