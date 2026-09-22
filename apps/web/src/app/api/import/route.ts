import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  recordGoogleSyncFailure,
  syncGoogleKnowledge,
} from "@/lib/integrations/google-sync";
import { syncMicrosoftKnowledge } from "@/lib/integrations/microsoft-sync";
import { autoLearnFromSource } from "@/lib/rag/embeddings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ImportResults = {
  contacts: number;
  listings: number;
  inspections: number;
  writing_examples: number;
  calendar_events: number;
};

type ImportSource = {
  id: string;
  label: string;
  status: "synced" | "not_connected" | "failed";
  message: string;
};

type ConnectedAccount = {
  id: string;
  provider: "google" | "microsoft";
  email: string | null;
  display_name: string | null;
};

function readableProvider(provider: ConnectedAccount["provider"]) {
  return provider === "microsoft" ? "Microsoft 365" : "Google";
}

function sourceLabel(account: ConnectedAccount) {
  const identity = account.email || account.display_name;
  return identity
    ? `${readableProvider(account.provider)} (${identity})`
    : readableProvider(account.provider);
}

function safeWarning(provider: ConnectedAccount["provider"]) {
  return `${readableProvider(provider)} could not be synced. Reconnect it from Settings, then try again.`;
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
      console.error(
        "Onboarding import membership lookup failed",
        membershipError.code,
      );
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
    const admin = createAdminClient();
    const warnings: string[] = [];
    const sources: ImportSource[] = [];
    const importResults: ImportResults = {
      contacts: 0,
      listings: 0,
      inspections: 0,
      writing_examples: 0,
      calendar_events: 0,
    };

    const { data: connectedAccounts, error: accountsError } = await admin
      .from("integration_accounts")
      .select("id,provider,email,display_name")
      .eq("org_id", orgId)
      .eq("status", "connected")
      .in("provider", ["google", "microsoft"])
      .order("is_primary", { ascending: false });

    if (accountsError) {
      console.warn(
        "Onboarding import could not load connected accounts",
        accountsError.code,
      );
      warnings.push(
        "Connected accounts could not be checked. Your existing workspace data was still imported.",
      );
    }

    const accounts = (connectedAccounts || []) as ConnectedAccount[];
    if (accounts.length === 0 && !accountsError) {
      sources.push({
        id: "email-calendar",
        label: "Email & calendar",
        status: "not_connected",
        message:
          "Connect Google or Microsoft 365 to import email and calendar data.",
      });
    }

    for (const account of accounts) {
      try {
        const result =
          account.provider === "microsoft"
            ? await syncMicrosoftKnowledge(orgId, user.id, account.id)
            : await syncGoogleKnowledge(orgId, user.id, account.id);
        const checked = result.gmail.total + result.calendar.total;
        sources.push({
          id: account.id,
          label: sourceLabel(account),
          status: "synced",
          message: `${checked} email and calendar item${checked === 1 ? "" : "s"} checked.`,
        });
      } catch (error) {
        console.error(
          `Onboarding ${account.provider} sync failed`,
          error instanceof Error ? error.message : error,
        );
        const warning = safeWarning(account.provider);
        warnings.push(warning);
        sources.push({
          id: account.id,
          label: sourceLabel(account),
          status: "failed",
          message: warning,
        });
        if (account.provider === "google") {
          await recordGoogleSyncFailure(orgId, error, account.id).catch(
            (healthError) => {
              console.warn(
                "Onboarding import could not record Google sync health",
                healthError,
              );
            },
          );
        } else {
          await admin
            .from("integration_accounts")
            .update({
              last_error:
                error instanceof Error
                  ? error.message.slice(0, 300)
                  : "Microsoft 365 sync failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id)
            .eq("org_id", orgId);
        }
      }
    }

    const [
      leadsRead,
      listingsRead,
      inspectionsRead,
      calendarRead,
      examplesRead,
    ] = await Promise.all([
      admin
        .from("leads")
        .select("id,full_name,email,status", { count: "exact" })
        .eq("org_id", orgId)
        .limit(1000),
      admin
        .from("listings")
        .select("id,address,price,property_type", { count: "exact" })
        .eq("org_id", orgId)
        .limit(500),
      admin
        .from("inspection_bookings")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      admin
        .from("knowledge_documents")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("source", "calendar")
        .eq("status", "indexed"),
      admin
        .from("communication_examples")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("user_id", user.id)
        .eq("approved", true)
        .eq("excluded", false),
    ]);

    const readWarning = (label: string, code?: string) => {
      console.warn(`Onboarding import could not read ${label}`, code);
      warnings.push(
        `${label} could not be checked, but the rest of the import continued.`,
      );
    };

    const leads = leadsRead.data || [];
    if (leadsRead.error)
      readWarning("Contacts and leads", leadsRead.error.code);
    else importResults.contacts = leadsRead.count ?? leads.length;

    const listings = listingsRead.data || [];
    if (listingsRead.error) readWarning("Listings", listingsRead.error.code);
    else importResults.listings = listingsRead.count ?? listings.length;

    if (inspectionsRead.error)
      readWarning("Inspection history", inspectionsRead.error.code);
    else importResults.inspections = inspectionsRead.count || 0;

    if (calendarRead.error)
      readWarning("Calendar events", calendarRead.error.code);
    else importResults.calendar_events = calendarRead.count || 0;

    if (examplesRead.error)
      readWarning("Writing style", examplesRead.error.code);
    else importResults.writing_examples = examplesRead.count || 0;

    const { data: existingKnowledge, error: knowledgeError } = await admin
      .from("knowledge_documents")
      .select("source,source_metadata")
      .eq("org_id", orgId)
      .in("source", ["crm", "listing"]);
    if (knowledgeError) {
      readWarning("AI knowledge", knowledgeError.code);
    }

    const knownLeadIds = new Set<string>();
    const knownListingIds = new Set<string>();
    for (const document of existingKnowledge || []) {
      const metadata = document.source_metadata as Record<
        string,
        unknown
      > | null;
      if (document.source === "crm" && typeof metadata?.lead_id === "string") {
        knownLeadIds.add(metadata.lead_id);
      }
      if (
        document.source === "listing" &&
        typeof metadata?.listing_id === "string"
      ) {
        knownListingIds.add(metadata.listing_id);
      }
    }

    if (!leadsRead.error) {
      for (const lead of leads.slice(0, 50)) {
        if (knownLeadIds.has(lead.id)) continue;
        const leadContent =
          "Lead: " +
          (lead.full_name || "Unknown") +
          ", Email: " +
          (lead.email || "N/A") +
          ", Status: " +
          (lead.status || "New");
        try {
          await autoLearnFromSource(admin, orgId, "crm", leadContent, {
            lead_id: lead.id,
            source: "import",
          });
        } catch {
          console.warn("Onboarding import could not index lead", lead.id);
        }
      }
    }

    if (!listingsRead.error) {
      for (const listing of listings.slice(0, 20)) {
        if (knownListingIds.has(listing.id)) continue;
        const listingContent =
          "Listing: " +
          (listing.address || "Unknown") +
          ", Price: $" +
          (listing.price || "TBA") +
          ", Type: " +
          (listing.property_type || "Residential");
        try {
          await autoLearnFromSource(admin, orgId, "listing", listingContent, {
            listing_id: listing.id,
            source: "import",
          });
        } catch {
          console.warn("Onboarding import could not index listing", listing.id);
        }
      }
    }

    const now = new Date().toISOString();
    const { error: activityError } = await admin
      .from("clippy_activity_log")
      .insert({
        org_id: orgId,
        user_id: user.id,
        action: "data_import_complete",
        category: "onboarding",
        title: "Business data import checked",
        description: `${importResults.contacts} contacts and ${importResults.listings} listings are ready in Clippy`,
        metadata: { ...importResults, sources, warnings },
        impact_summary: "Available business data was synced and indexed",
        completed_at: now,
      });
    if (activityError) {
      console.warn(
        "Onboarding import activity logging failed",
        activityError.code,
      );
    }

    const { error: progressError } = await admin
      .from("onboarding_progress")
      .upsert(
        {
          org_id: orgId,
          current_phase: "complete",
          completed_phases: [0, 1, 2, 3, 4],
          profile_completed: true,
          import_completed: true,
          completed_at: now,
          updated_at: now,
        },
        { onConflict: "org_id" },
      );
    if (progressError) {
      console.warn("Onboarding progress update failed", progressError.code);
      warnings.push(
        "Your data was imported, but setup progress could not be saved automatically.",
      );
    }

    const total = Object.values(importResults).reduce(
      (sum, count) => sum + count,
      0,
    );

    return NextResponse.json({
      success: true,
      results: importResults,
      sources,
      warnings,
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
