import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const leadSchema = z.object({
  full_name: z.string().trim().max(160).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  phone: z.string().trim().max(50).default(""),
  source: z.string().trim().max(80).default("crm_import"),
  buyer_type: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(4000).default(""),
});

const payloadSchema = z.object({
  leads: z.array(leadSchema).min(1).max(500),
});

function identity(email: string, phone: string) {
  return email.toLowerCase() || phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json(
      { error: "Organisation membership required" },
      { status: 403 },
    );
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid CRM import" },
      { status: 400 },
    );
  }

  const { data: existing, error: readError } = await supabase
    .from("leads")
    .select("email,phone")
    .eq("org_id", membership.org_id)
    .limit(5000);
  if (readError) {
    return NextResponse.json(
      { error: "Existing clients could not be checked" },
      { status: 500 },
    );
  }

  const seen = new Set(
    (existing ?? [])
      .map((lead) => identity(lead.email || "", lead.phone || ""))
      .filter(Boolean),
  );
  const rows: Array<Record<string, unknown>> = [];
  let skipped = 0;
  for (const lead of parsed.data.leads) {
    if (!lead.full_name && !lead.email && !lead.phone) {
      skipped += 1;
      continue;
    }
    const key = identity(lead.email, lead.phone);
    if (key && seen.has(key)) {
      skipped += 1;
      continue;
    }
    if (key) seen.add(key);
    rows.push({
      org_id: membership.org_id,
      full_name: lead.full_name || null,
      email: lead.email || null,
      phone: lead.phone || null,
      source: lead.source || "crm_import",
      buyer_type: lead.buyer_type || null,
      notes: lead.notes || null,
      stage: "new",
      priority: "normal",
      last_activity_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped,
      total: parsed.data.leads.length,
    });
  }
  const { error } = await supabase.from("leads").insert(rows);
  if (error) {
    console.error("CRM lead import failed", error.code);
    return NextResponse.json(
      { error: "CRM leads could not be imported" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { imported: rows.length, skipped, total: parsed.data.leads.length },
    { status: 201 },
  );
}
