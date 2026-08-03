import { redirect } from "next/navigation";
import {
  CalendarWorkspace,
  type CalendarWorkspaceEvent,
} from "@/components/calendar-workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CalendarDocument = {
  id: string;
  title: string | null;
  source_metadata: Record<string, unknown> | null;
};

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function firstRelated<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function CalendarPage() {
  const startedAt = Date.now();
  const generatedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
  if (!userId) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) redirect("/onboarding");

  const admin = createAdminClient();
  const [calendarResult, bookingsResult, integrationResult, healthResult] =
    await Promise.all([
      supabase
        .from("knowledge_documents")
        .select("id,title,source_metadata")
        .eq("org_id", membership.org_id)
        .eq("user_id", userId)
        .eq("source", "calendar")
        .eq("status", "indexed")
        .limit(100),
      supabase
        .from("inspection_bookings")
        .select(
          "id,booking_status,leads(id,full_name),listings(id,address),inspection_time_slots(starts_at,ends_at,inspection_type,address)",
        )
        .eq("org_id", membership.org_id)
        .neq("booking_status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("integrations")
        .select("status,connected_at,last_sync_at,items_indexed")
        .eq("org_id", membership.org_id)
        .eq("provider", "google-calendar")
        .maybeSingle(),
      admin
        .from("integration_health")
        .select("status,last_sync_at,items_indexed")
        .eq("org_id", membership.org_id)
        .eq("provider", "google-calendar")
        .maybeSingle(),
    ]);

  if (calendarResult.error) {
    console.error(
      "Calendar workspace events failed",
      calendarResult.error.code,
    );
  }
  if (bookingsResult.error) {
    console.error(
      "Calendar workspace inspections failed",
      bookingsResult.error.code,
    );
  }
  if (integrationResult.error) {
    console.error(
      "Calendar workspace connection failed",
      integrationResult.error.code,
    );
  }
  if (healthResult.error) {
    console.error("Calendar workspace health failed", healthResult.error.code);
  }

  const now = Date.now();
  const googleEvents = (
    (calendarResult.data ?? []) as CalendarDocument[]
  ).flatMap((document): CalendarWorkspaceEvent[] => {
    const startsAt = metadataText(document.source_metadata, "starts_at");
    if (!startsAt || new Date(startsAt).getTime() < now - 86_400_000) {
      return [];
    }
    return [
      {
        id: document.id,
        title: document.title || "Untitled calendar event",
        starts_at: startsAt,
        ends_at: metadataText(document.source_metadata, "ends_at"),
        location: metadataText(document.source_metadata, "location"),
        source: "google",
        status: "confirmed",
        client: null,
        property: null,
      },
    ];
  });

  const inspectionEvents = (bookingsResult.data ?? []).flatMap(
    (booking): CalendarWorkspaceEvent[] => {
      const slot = firstRelated(booking.inspection_time_slots);
      if (!slot || new Date(slot.starts_at).getTime() < now - 86_400_000) {
        return [];
      }
      const client = firstRelated(booking.leads);
      const property = firstRelated(booking.listings);
      return [
        {
          id: booking.id,
          title: `${slot.inspection_type.replaceAll("_", " ")} · ${
            property?.address || client?.full_name || "Property inspection"
          }`,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          location: slot.address || property?.address || null,
          source: "inspection",
          status: booking.booking_status,
          client: client
            ? { id: client.id, name: client.full_name || null }
            : null,
          property: property
            ? { id: property.id, address: property.address || null }
            : null,
        },
      ];
    },
  );

  const events = [...googleEvents, ...inspectionEvents].sort(
    (left, right) =>
      new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
  );
  const integration = integrationResult.data;
  const health = healthResult.data;
  const status = health?.status || integration?.status || "disconnected";

  console.log(
    JSON.stringify({
      level: "info",
      message: "Calendar page completed",
      route: "/calendar",
      duration_ms: Date.now() - startedAt,
      event_count: events.length,
      vercel_region: process.env.VERCEL_REGION || null,
    }),
  );

  return (
    <CalendarWorkspace
      events={events}
      generatedAt={generatedAt}
      connection={{
        connected: ["connected", "healthy"].includes(status),
        status,
        lastSyncAt: health?.last_sync_at || integration?.last_sync_at || null,
        itemsIndexed:
          health?.items_indexed ||
          integration?.items_indexed ||
          googleEvents.length,
      }}
    />
  );
}
