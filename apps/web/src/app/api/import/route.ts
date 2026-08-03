import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoLearnFromSource } from "@/lib/rag/embeddings";

export const dynamic = "force-dynamic";

type ImportResults = {
  contacts: number;
  listings: number;
  inspections: number;
  templates: number;
  calendar_events: number;
};

function importReadError(source: string, code?: string) {
  console.error(`Onboarding import failed while reading ${source}`, code);
  return NextResponse.json(
    {
      error: `${source} could not be imported`,
      success: false,
    },
    { status: 500 },
  );
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember, error: membershipError } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Onboarding import membership lookup failed", membershipError.code);
      return NextResponse.json(
        { error: "Workspace could not be loaded" },
        { status: 500 },
      );
    }
    if (!orgMember) {
      return NextResponse.json(
        { error: "Complete your agency setup before importing data" },
        { status: 409 },
      );
    }

    const orgId = orgMember.org_id;
    const importResults: ImportResults = {
      contacts: 0,
      listings: 0,
      inspections: 0,
      templates: 0,
      calendar_events: 0,
    };

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id,full_name,email,status")
      .eq("org_id", orgId)
      .limit(1000);
    if (leadsError) return importReadError("Contacts and leads", leadsError.code);

    importResults.contacts = leads.length;
    for (const lead of leads.slice(0, 50)) {
      const leadContent =
        "Lead: " +
        (lead.full_name || "Unknown") +
        ", Email: " +
        (lead.email || "N/A") +
        ", Status: " +
        (lead.status || "New");
      try {
        await autoLearnFromSource(supabase, orgId, "crm", leadContent, {
          lead_id: lead.id,
          source: "import",
        });
      } catch {
        console.warn("Onboarding import could not index lead", lead.id);
      }
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id,address,price,property_type")
      .eq("org_id", orgId)
      .limit(500);
    if (listingsError) return importReadError("Listings", listingsError.code);

    importResults.listings = listings.length;
    for (const listing of listings.slice(0, 20)) {
      const listingContent =
        "Listing: " +
        (listing.address || "Unknown") +
        ", Price: $" +
        (listing.price || "TBA") +
        ", Type: " +
        (listing.property_type || "Residential");
      try {
        await autoLearnFromSource(supabase, orgId, "listing", listingContent, {
          listing_id: listing.id,
          source: "import",
        });
      } catch {
        console.warn("Onboarding import could not index listing", listing.id);
      }
    }

    const { data: inspections, error: inspectionsError } = await supabase
      .from("inspection_bookings")
      .select("id")
      .eq("org_id", orgId)
      .limit(200);
    if (inspectionsError) {
      return importReadError("Inspections", inspectionsError.code);
    }
    importResults.inspections = inspections.length;

    const { data: events, error: eventsError } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("org_id", orgId)
      .limit(500);
    if (eventsError) {
      return importReadError("Calendar events", eventsError.code);
    }
    importResults.calendar_events = events.length;

    const { error: activityError } = await supabase
      .from("clippy_activity_log")
      .insert({
        org_id: orgId,
        user_id: user.id,
        action: "data_import_complete",
        category: "onboarding",
        title: "Business data imported",
        description:
          "Imported " +
          importResults.contacts +
          " contacts, " +
          importResults.listings +
          " listings",
        metadata: importResults,
        impact_summary: "Business data indexed for AI learning",
        completed_at: new Date().toISOString(),
      });
    if (activityError) {
      console.warn("Onboarding import activity logging failed", activityError.code);
    }

    const { error: progressError } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          org_id: orgId,
          current_phase: "complete",
          completed_phases: [0, 1, 2, 3, 4],
          profile_completed: true,
          import_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" },
      );
    if (progressError) {
      console.error("Onboarding progress update failed", progressError.code);
      return NextResponse.json(
        { error: "Import completed, but onboarding progress could not be saved" },
        { status: 500 },
      );
    }

    const total = Object.values(importResults).reduce(
      (sum, count) => sum + count,
      0,
    );

    return NextResponse.json({
      success: true,
      results: importResults,
      total,
    });
  } catch (error) {
    console.error("Onboarding import failed", error);
    return NextResponse.json(
      {
        error: "Business data could not be imported",
        success: false,
      },
      { status: 500 },
    );
  }
}
