import { createClient } from "@/lib/supabase/server";
import { autoLearnFromSource, chunkText, generateEmbeddings, storeKnowledgeChunks } from "@/lib/rag/embeddings";

/**
 * Clippy Auto-Learning Pipeline
 * Runs in background to learn from emails, calendar, CRM, conversations
 */

// Learn from Gmail emails
export async function learnFromEmails(orgId: string, userId: string) {
  const supabase = await createClient();

  // Get connected Gmail integration
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .single();

  if (!integration) {
    return { learned: 0, reason: "Gmail not connected" };
  }

  // In production, fetch emails via Gmail API
  // For now, simulate learning from email content
  const emails = [
    {
      subject: "Re: Property Inspection",
      content: "Thanks for scheduling the inspection. I'll be there at 2pm on Saturday.",
      from: "client@example.com",
      date: new Date().toISOString(),
    },
  ];

  let learned = 0;
  for (const email of emails) {
    try {
      await autoLearnFromSource(supabase, orgId, "email", email.content, {
        title: email.subject,
        user_id: userId,
        email_from: email.from,
        email_date: email.date,
      });
      learned++;
    } catch (error) {
      console.error("Failed to learn from email:", error);
    }
  }

  // Update integration health
  await supabase
    .from("integration_health")
    .upsert({
      org_id: orgId,
      provider: "gmail",
      status: "healthy",
      items_indexed: learned,
      last_sync_at: new Date().toISOString(),
      activity_summary: { emails_indexed: learned },
    });

  return { learned };
}

// Learn from Calendar events
export async function learnFromCalendar(orgId: string, userId: string) {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", "calendar")
    .eq("status", "connected")
    .single();

  if (!integration) {
    return { learned: 0, reason: "Calendar not connected" };
  }

  // Simulate learning from calendar events
  const events = [
    {
      title: "Property Inspection - 123 Main St",
      description: "Inspecting 3BR 2BA house with buyers",
      start: new Date().toISOString(),
    },
  ];

  let learned = 0;
  for (const event of events) {
    try {
      await autoLearnFromSource(supabase, orgId, "calendar", event.description || "", {
        title: event.title,
        user_id: userId,
        event_start: event.start,
      });
      learned++;
    } catch (error) {
      console.error("Failed to learn from calendar:", error);
    }
  }

  await supabase
    .from("integration_health")
    .upsert({
      org_id: orgId,
      provider: "calendar",
      status: "healthy",
      items_indexed: learned,
      last_sync_at: new Date().toISOString(),
      activity_summary: { events_indexed: learned },
    });

  return { learned };
}

// Learn from CRM conversations
export async function learnFromConversations(orgId: string, userId: string) {
  const supabase = await createClient();

  // Get recent conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, conversation_messages(content, role), leads(full_name, email)")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!conversations || conversations.length === 0) {
    return { learned: 0, reason: "No conversations" };
  }

  let learned = 0;
  for (const conv of conversations) {
    const messages = conv.conversation_messages || [];
    const content = messages.map((m: any) => m.content).join("\n");

    try {
      await autoLearnFromSource(supabase, orgId, "conversation", content, {
        title: "Inspection Report",
        user_id: userId,
        client_id: conv.lead_id,
        conversation_id: conv.id,
      });
      learned++;
    } catch (error) {
      console.error("Failed to learn from conversation:", error);
    }
  }

  return { learned };
}

// Learn from inspection reports
export async function learnFromInspections(orgId: string, userId: string) {
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("inspection_bookings")
    .select("*, leads(full_name), listings(address)")
    .eq("org_id", orgId)
    .limit(10);

  if (!bookings || bookings.length === 0) {
    return { learned: 0, reason: "No inspections" };
  }

  let learned = 0;
  for (const booking of bookings) {
    const content = "Inspection report for booking " + booking.id + " (Lead: " + booking.lead_id + ")";

    try {
      await autoLearnFromSource(supabase, orgId, "inspection_report", content, {
        title: "Inspection Report",
        user_id: userId,
        client_id: booking.lead_id,
        booking_id: booking.id,
      });
      learned++;
    } catch (error) {
      console.error("Failed to learn from inspection:", error);
    }
  }

  return { learned };
}

// Main pipeline runner
export async function runAutoLearningPipeline(orgId: string, userId: string) {
  const results = {
    emails: await learnFromEmails(orgId, userId),
    calendar: await learnFromCalendar(orgId, userId),
    conversations: await learnFromConversations(orgId, userId),
    inspections: await learnFromInspections(orgId, userId),
  };

  const total = Object.values(results).reduce((sum: any, r: any) => sum + (r.learned || 0), 0);

  // Log activity
  const supabase = await createClient();
  await supabase.from("clippy_activity_log").insert({
    org_id: orgId,
    user_id: userId,
    action: "auto_learning_complete",
    category: "knowledge",
    title: "Auto-learning pipeline completed",
    description: ,
    description: "Auto-learning completed",
    impact_summary: ,
    impact_summary: "Knowledge items added",
  });

  return { total, results };
}
