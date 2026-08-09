import { redirect } from "next/navigation";
import { CopilotPage } from "@/components/copilot-page";
import type {
  CopilotContextItem,
  CopilotContextSelection,
} from "@/lib/copilot-context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatContextDate(value: string | null) {
  if (!value) return "Date not recorded";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  }).format(new Date(value));
}

export default async function Copilot({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const [
    clientsResult,
    propertiesResult,
    enquiriesResult,
    conversationsResult,
    calendarResult,
    inspectionsResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,full_name,email,phone,stage,created_at")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("listings")
      .select("id,address,status,created_at")
      .eq("org_id", membership.org_id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("property_enquiries")
      .select(
        "id,lead_id,listing_id,status,source,last_activity_at,leads(id,full_name),listings(id,address)",
      )
      .eq("org_id", membership.org_id)
      .order("last_activity_at", { ascending: false })
      .limit(500),
    supabase
      .from("conversations")
      .select(
        "id,lead_id,listing_id,enquiry_id,channel,last_message_at,leads(id,full_name),listings(id,address)",
      )
      .eq("org_id", membership.org_id)
      .order("last_message_at", { ascending: false })
      .limit(500),
    supabase
      .from("knowledge_documents")
      .select("id,title,source_metadata")
      .eq("org_id", membership.org_id)
      .eq("user_id", user.id)
      .eq("source", "calendar")
      .eq("status", "indexed")
      .limit(100),
    supabase
      .from("inspection_bookings")
      .select(
        "id,lead_id,listing_id,conversation_id,booking_status,leads(id,full_name),listings(id,address),conversations(id,enquiry_id),inspection_time_slots(starts_at,inspection_type)",
      )
      .eq("org_id", membership.org_id)
      .neq("booking_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const results = [
    ["clients", clientsResult.error],
    ["properties", propertiesResult.error],
    ["enquiries", enquiriesResult.error],
    ["conversations", conversationsResult.error],
    ["calendar", calendarResult.error],
    ["inspections", inspectionsResult.error],
  ] as const;
  for (const [label, error] of results) {
    if (error)
      console.error(`Copilot ${label} context load failed`, error.code);
  }

  const items: CopilotContextItem[] = [];

  for (const conversation of conversationsResult.data ?? []) {
    const client = firstRelated(conversation.leads);
    const property = firstRelated(conversation.listings);
    items.push({
      key: `conversation:${conversation.id}`,
      kind: "conversation",
      label: client?.full_name || "Unnamed client",
      description: [
        property?.address || "General conversation",
        conversation.channel,
        formatContextDate(conversation.last_message_at),
      ].join(" · "),
      context: {
        leadId: conversation.lead_id,
        listingId: conversation.listing_id || undefined,
        enquiryId: conversation.enquiry_id || undefined,
        conversationId: conversation.id,
      },
    });
  }

  for (const enquiry of enquiriesResult.data ?? []) {
    const client = firstRelated(enquiry.leads);
    const property = firstRelated(enquiry.listings);
    items.push({
      key: `enquiry:${enquiry.id}`,
      kind: "enquiry",
      label: client?.full_name || "Unnamed client",
      description: [
        property?.address || "Property not linked",
        `${enquiry.source} enquiry`,
        enquiry.status.replaceAll("_", " "),
      ].join(" · "),
      context: {
        leadId: enquiry.lead_id,
        listingId: enquiry.listing_id || undefined,
        enquiryId: enquiry.id,
      },
    });
  }

  for (const inspection of inspectionsResult.data ?? []) {
    const client = firstRelated(inspection.leads);
    const property = firstRelated(inspection.listings);
    const conversation = firstRelated(inspection.conversations);
    const slot = firstRelated(inspection.inspection_time_slots);
    items.push({
      key: `calendar:inspection:${inspection.id}`,
      kind: "calendar",
      label: property?.address || client?.full_name || "Property inspection",
      description: [
        client?.full_name || "No client linked",
        slot?.inspection_type?.replaceAll("_", " ") || "inspection",
        formatContextDate(slot?.starts_at || null),
      ].join(" · "),
      context: {
        leadId: inspection.lead_id || undefined,
        listingId: inspection.listing_id || undefined,
        enquiryId: conversation?.enquiry_id || undefined,
        conversationId: inspection.conversation_id || undefined,
        calendarEventId: inspection.id,
        calendarSource: "inspection",
      },
    });
  }

  for (const event of calendarResult.data ?? []) {
    items.push({
      key: `calendar:google:${event.id}`,
      kind: "calendar",
      label: event.title || "Untitled calendar event",
      description: [
        formatContextDate(metadataText(event.source_metadata, "starts_at")),
        metadataText(event.source_metadata, "location"),
        "Google Calendar",
      ]
        .filter(Boolean)
        .join(" · "),
      context: {
        calendarEventId: event.id,
        calendarSource: "google",
      },
    });
  }

  for (const client of clientsResult.data ?? []) {
    items.push({
      key: `client:${client.id}`,
      kind: "client",
      label: client.full_name || "Unnamed client",
      description:
        [client.email, client.phone, client.stage?.replaceAll("_", " ")]
          .filter(Boolean)
          .join(" · ") || "Client record",
      context: { leadId: client.id },
    });
  }

  for (const property of propertiesResult.data ?? []) {
    items.push({
      key: `property:${property.id}`,
      kind: "property",
      label: property.address || "Address not recorded",
      description: property.status
        ? `${property.status.replaceAll("_", " ")} property`
        : "Property record",
      context: { listingId: property.id },
    });
  }

  const initialContext: CopilotContextSelection = {
    leadId: firstParam(params.lead_id),
    listingId: firstParam(params.listing_id),
    enquiryId: firstParam(params.enquiry_id),
    conversationId: firstParam(params.conversation_id),
    calendarEventId: firstParam(params.calendar_event_id),
    calendarSource: firstParam(params.calendar_source) as
      "google" | "inspection" | undefined,
  };

  return <CopilotPage contextItems={items} initialContext={initialContext} />;
}
