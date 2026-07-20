import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autoLearnFromSource } from "@/lib/rag/embeddings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgMember } = await supabase
      .from("user_org_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const orgId = orgMember.org_id;

    const importResults: any = {
      contacts: 0,
      listings: 0,
      inspections: 0,
      templates: 0,
      calendar_events: 0,
    };

    // Import contacts/leads
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("org_id", orgId)
      .limit(1000);

    if (leads && leads.length > 0) {
      importResults.contacts = leads.length;
      
      for (const lead of leads.slice(0, 50)) {
        const leadContent = "Lead: " + (lead.full_name || "Unknown") + ", Email: " + (lead.email || "N/A") + ", Status: " + (lead.status || "New");
        try {
          await autoLearnFromSource(supabase, orgId, "crm", leadContent, {
            lead_id: lead.id,
            source: "import",
          });
        } catch (e) {
          console.error("Failed to learn from lead:", lead.id);
        }
      }
    }

    // Import listings
    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("org_id", orgId)
      .limit(500);

    if (listings && listings.length > 0) {
      importResults.listings = listings.length;
      
      for (const listing of listings.slice(0, 20)) {
        const listingContent = "Listing: " + (listing.address || "Unknown") + ", Price: $" + (listing.price || "TBA") + ", Type: " + (listing.property_type || "Residential");
        try {
          await autoLearnFromSource(supabase, orgId, "listing", listingContent, {
            listing_id: listing.id,
            source: "import",
          });
        } catch (e) {
          console.error("Failed to learn from listing:", listing.id);
        }
      }
    }

    // Import inspections
    const { data: inspections } = await supabase
      .from("inspections")
      .select("*")
      .eq("org_id", orgId)
      .limit(200);

    if (inspections && inspections.length > 0) {
      importResults.inspections = inspections.length;
    }

    // Import calendar events
    const { data: events } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("org_id", orgId)
      .limit(500);

    if (events && events.length > 0) {
      importResults.calendar_events = events.length;
    }

    // Log activity
    await supabase.from("clippy_activity_log").insert({
      org_id: orgId,
      user_id: user.id,
      action: "data_import_complete",
      category: "onboarding",
      title: "Business data imported",
      description: "Imported " + importResults.contacts + " contacts, " + importResults.listings + " listings",
      metadata: importResults,
      impact_summary: "Business data indexed for AI learning",
      completed_at: new Date().toISOString(),
    });

    // Update onboarding progress
    await supabase
      .from("onboarding_progress")
      .upsert({
        org_id: orgId,
        user_id: user.id,
        current_phase: 4,
        completed_phases: [0, 1, 2, 3, 4],
        completed_at: new Date().toISOString(),
      });

    const total = Object.values(importResults).reduce((a: any, b: any) => a + b, 0);

    return NextResponse.json({
      success: true,
      results: importResults,
      total,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ 
      error: error.message,
      success: false,
      results: { contacts: 0, listings: 0, inspections: 0, templates: 0, calendar_events: 0 }
    }, { status: 500 });
  }
}
