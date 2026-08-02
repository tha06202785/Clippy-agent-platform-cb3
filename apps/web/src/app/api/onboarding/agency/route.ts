import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CRM_IDS, crmName } from "@/lib/crm-catalog";
import { buildPersonalWorkspaceSeed } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

const setupSchema = z
  .object({
    agencyName: z.string().trim().min(2).max(120),
    agencyType: z.enum([
      "residential_sales",
      "property_management",
      "commercial",
      "buyers_agent",
    ]),
    agencySize: z.string().trim().max(30).optional(),
    location: z.string().trim().max(120).optional(),
    primaryCrm: z.string().trim().min(1),
    otherCrmName: z.string().trim().max(120).optional(),
    brandPersonality: z.string().trim().max(40).optional(),
  })
  .superRefine((value, context) => {
    if (!CRM_IDS.has(value.primaryCrm)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryCrm"],
        message: "Select a supported CRM option",
      });
    }
    if (value.primaryCrm === "other" && !value.otherCrmName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherCrmName"],
        message: "Enter the name of your CRM",
      });
    }
  });

type AdminClient = ReturnType<typeof createAdminClient>;
type Membership = { org_id: string; role: string };

async function findMembership(
  admin: AdminClient,
  userId: string,
): Promise<Membership | null> {
  const { data, error } = await admin
    .from("user_org_roles")
    .select("org_id,role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Onboarding membership lookup failed", error.code);
    throw new Error("membership_lookup_failed");
  }

  return data;
}

async function ensureMembership(
  admin: AdminClient,
  user: User,
  agencyName: string,
): Promise<{ membership: Membership; created: boolean }> {
  const existing = await findMembership(admin, user.id);
  if (existing) return { membership: existing, created: false };

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const seed = buildPersonalWorkspaceSeed({
    userId: user.id,
    fullName,
    agencyName,
  });

  const { error: organisationError } = await admin
    .from("orgs")
    .upsert(seed.organisation, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  if (organisationError) {
    console.error(
      "Onboarding organisation provisioning failed",
      organisationError.code,
    );
    throw new Error("organisation_provisioning_failed");
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(seed.profile, {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });
  if (profileError) {
    console.error("Onboarding profile provisioning failed", profileError.code);
    throw new Error("profile_provisioning_failed");
  }

  const { error: membershipError } = await admin
    .from("user_org_roles")
    .upsert(seed.membership, {
      onConflict: "user_id,org_id",
      ignoreDuplicates: true,
    });
  if (membershipError) {
    console.error(
      "Onboarding membership provisioning failed",
      membershipError.code,
    );
    throw new Error("membership_provisioning_failed");
  }

  const membership = await findMembership(admin, user.id);
  if (!membership) throw new Error("membership_provisioning_incomplete");

  return { membership, created: true };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const parsed = setupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid agency setup" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { membership, created } = await ensureMembership(
      admin,
      user,
      parsed.data.agencyName,
    );

    const { data: existingOrg, error: orgLookupError } = await admin
      .from("orgs")
      .select("settings_json")
      .eq("id", membership.org_id)
      .single();
    if (orgLookupError) {
      console.error(
        "Onboarding organisation lookup failed",
        orgLookupError.code,
      );
      return NextResponse.json(
        { error: "Unable to save agency setup" },
        { status: 500 },
      );
    }

    const currentSettings =
      existingOrg.settings_json &&
      typeof existingOrg.settings_json === "object" &&
      !Array.isArray(existingOrg.settings_json)
        ? existingOrg.settings_json
        : {};
    const selectedCrmName =
      parsed.data.primaryCrm === "other"
        ? parsed.data.otherCrmName!
        : crmName(parsed.data.primaryCrm);

    const { error: updateError } = await admin
      .from("orgs")
      .update({
        name: parsed.data.agencyName,
        settings_json: {
          ...currentSettings,
          agency_type: parsed.data.agencyType,
          agency_size: parsed.data.agencySize || null,
          location: parsed.data.location || null,
          brand_personality: parsed.data.brandPersonality || null,
          primary_crm: {
            key: parsed.data.primaryCrm,
            name: selectedCrmName,
            selected_at: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership.org_id);
    if (updateError) {
      console.error("Onboarding organisation update failed", updateError.code);
      return NextResponse.json(
        { error: "Unable to save agency setup" },
        { status: 500 },
      );
    }

    const { error: integrationError } = await admin.from("integrations").upsert(
      {
        org_id: membership.org_id,
        provider: "crm",
        status: parsed.data.primaryCrm === "none" ? "not_required" : "selected",
        settings_json: {
          provider_key: parsed.data.primaryCrm,
          provider_name: selectedCrmName,
          connection_mode: "pending_setup",
          selected_by_user_id: user.id,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,provider" },
    );
    if (integrationError) {
      console.error("CRM selection persistence failed", integrationError.code);
      return NextResponse.json(
        { error: "Agency saved, but CRM selection could not be saved" },
        { status: 500 },
      );
    }

    const { error: activityError } = await admin
      .from("clippy_activity_log")
      .insert({
        org_id: membership.org_id,
        user_id: user.id,
        action: "primary_crm_selected",
        category: "onboarding",
        title: `${selectedCrmName} selected as primary CRM`,
        metadata: {
          provider_key: parsed.data.primaryCrm,
          provider_name: selectedCrmName,
          workspace_created: created,
        },
        impact_summary:
          "CRM connection preference captured for integration setup",
        completed_at: new Date().toISOString(),
      });
    if (activityError) {
      console.warn("Onboarding activity logging failed", activityError.code);
    }

    return NextResponse.json({
      success: true,
      workspace_created: created,
      crm: {
        key: parsed.data.primaryCrm,
        name: selectedCrmName,
        status:
          parsed.data.primaryCrm === "none" ? "not_required" : "selected",
      },
    });
  } catch (error) {
    console.error("Agency onboarding failed", error);
    return NextResponse.json(
      { error: "Unable to save agency setup" },
      { status: 500 },
    );
  }
}
