import {
  importPhoneIdentityVariants,
  normaliseImportPhone,
} from "@/lib/crm-import-deduplication";

type LeadChannel = "email" | "facebook" | "whatsapp";

type ResolveLeadInput = {
  supabase: any;
  orgId: string;
  channel: LeadChannel;
  identity: string;
  name?: string | null;
};

const identityColumn: Record<LeadChannel, string> = {
  email: "email_normalized",
  facebook: "facebook_psid",
  whatsapp: "whatsapp_id",
};

export function normaliseLeadIdentity(channel: LeadChannel, value: string) {
  const trimmed = value.trim();
  if (channel === "email") return trimmed.toLowerCase();
  if (channel === "whatsapp") return normaliseImportPhone(trimmed);
  return trimmed;
}

export async function resolveOrCreateLead({
  supabase,
  orgId,
  channel,
  identity,
  name = null,
}: ResolveLeadInput): Promise<string> {
  const normalised = normaliseLeadIdentity(channel, identity);
  if (!normalised) throw new Error(`Missing ${channel} identity`);

  const column = identityColumn[channel];
  const findIdentity = () => {
    const query = supabase
      .from("lead_identities")
      .select("lead_id")
      .eq("org_id", orgId);
    const matchedQuery =
      channel === "whatsapp"
        ? query.in(column, importPhoneIdentityVariants(normalised))
        : query.eq(column, normalised);
    return matchedQuery.limit(1).maybeSingle();
  };

  const { data: existingIdentity, error: identityError } = await findIdentity();
  if (identityError) throw identityError;
  if (existingIdentity?.lead_id) return existingIdentity.lead_id;

  let existingLeadId: string | undefined;
  if (channel === "email" || channel === "whatsapp") {
    const leadColumn = channel === "email" ? "email" : "phone";
    const { data: candidates, error } = await supabase
      .from("leads")
      .select(`id, ${leadColumn}`)
      .eq("org_id", orgId)
      .not(leadColumn, "is", null)
      .limit(1000);
    if (error) throw error;
    existingLeadId = candidates?.find((lead: any) =>
      normaliseLeadIdentity(channel, String(lead[leadColumn] || "")) === normalised
    )?.id;
  }

  let leadId = existingLeadId;
  let createdLeadId: string | undefined;
  if (!leadId) {
    const { data: lead, error } = await supabase.from("leads").insert({
      org_id: orgId,
      full_name: name,
      email: channel === "email" ? normalised : null,
      phone: channel === "whatsapp" ? normalised : null,
      source: channel,
      stage: "unknown",
    }).select("id").single();
    if (error || !lead) throw error || new Error("Lead creation failed");
    leadId = lead.id;
    createdLeadId = lead.id;
  }

  const { error: insertError } = await supabase.from("lead_identities").insert({
    org_id: orgId,
    lead_id: leadId,
    channel,
    [column]: normalised,
  });
  if (!insertError) return leadId!;

  if (insertError.code === "23505") {
    const { data: winner, error } = await findIdentity();
    if (createdLeadId && winner?.lead_id && winner.lead_id !== createdLeadId) {
      await supabase.from("leads").delete().eq("id", createdLeadId).eq("org_id", orgId);
    }
    if (!error && winner?.lead_id) return winner.lead_id;
  }
  throw insertError;
}
