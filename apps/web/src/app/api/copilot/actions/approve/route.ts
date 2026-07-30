import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const approvalSchema = z.object({
  draft_id: z.string().trim().min(1).max(120),
  channel: z.enum(["email", "sms", "whatsapp", "copy"]),
  subject: z.string().trim().max(300).nullable().optional(),
  content: z.string().trim().min(1).max(12_000),
  lead_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const parsed = approvalSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid approval" },
      { status: 400 },
    );
  }

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) {
    return NextResponse.json(
      { error: "No organisation is linked to this account." },
      { status: 409 },
    );
  }

  let leadId = parsed.data.lead_id;
  if (parsed.data.conversation_id) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,lead_id")
      .eq("id", parsed.data.conversation_id)
      .eq("org_id", membership.org_id)
      .maybeSingle();
    if (!conversation) {
      return NextResponse.json(
        { error: "The selected conversation is unavailable." },
        { status: 404 },
      );
    }
    if (leadId && conversation.lead_id !== leadId) {
      return NextResponse.json(
        { error: "The selected client and conversation do not match." },
        { status: 400 },
      );
    }
    leadId = conversation.lead_id;
  }

  let recipient: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } = { name: null, email: null, phone: null };
  if (leadId) {
    const { data: client } = await supabase
      .from("leads")
      .select("full_name,email,phone")
      .eq("id", leadId)
      .eq("org_id", membership.org_id)
      .maybeSingle();
    if (!client) {
      return NextResponse.json(
        { error: "The selected client is unavailable." },
        { status: 404 },
      );
    }
    recipient = {
      name: client.full_name,
      email: client.email,
      phone: client.phone,
    };
  }

  if (parsed.data.channel === "email" && !recipient.email) {
    return NextResponse.json(
      { error: "This client does not have an email address." },
      { status: 400 },
    );
  }
  if (["sms", "whatsapp"].includes(parsed.data.channel) && !recipient.phone) {
    return NextResponse.json(
      { error: "This client does not have a phone number." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const approvalPrefix = `approval:${parsed.data.draft_id};`;
  const { data: existing } = await admin
    .from("ai_actions")
    .select("id,created_at")
    .eq("org_id", membership.org_id)
    .eq("action_type", `draft_approved_${parsed.data.channel}`)
    .like("input_summary", `${approvalPrefix}%`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      approved: true,
      approval_id: existing.id,
      approved_at: existing.created_at,
      recipient,
      duplicate: true,
    });
  }

  const inputSummary = [
    approvalPrefix,
    `approved_by:${user.id};`,
    `subject:${parsed.data.subject || ""};`,
  ].join("");
  const { data: approval, error } = await admin
    .from("ai_actions")
    .insert({
      org_id: membership.org_id,
      lead_id: leadId || null,
      conversation_id: parsed.data.conversation_id || null,
      action_type: `draft_approved_${parsed.data.channel}`,
      input_summary: inputSummary,
      output_summary: parsed.data.content,
      confidence: 1,
      escalated: false,
    })
    .select("id,created_at")
    .single();

  if (error || !approval) {
    console.error("Draft approval audit failed", error?.code);
    return NextResponse.json(
      { error: "The draft could not be approved. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    approved: true,
    approval_id: approval.id,
    approved_at: approval.created_at,
    recipient,
    duplicate: false,
  });
}
