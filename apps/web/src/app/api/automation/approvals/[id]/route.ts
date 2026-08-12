import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deliverApprovedMessage } from "@/lib/channels/deliver-approved-message";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  content: z.string().trim().min(1).max(12_000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid approval" }, { status: 400 });
  const parsed = decisionSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: approval } = await admin
    .from("automation_approvals")
    .select("*")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .eq("status", "pending")
    .maybeSingle();
  if (!approval)
    return NextResponse.json(
      { error: "This approval is no longer pending" },
      { status: 409 },
    );

  const now = new Date().toISOString();
  if (parsed.data.decision === "reject") {
    await admin
      .from("automation_approvals")
      .update({
        status: "rejected",
        decided_at: now,
        decided_by_user_id: user.id,
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "pending");
    if (approval.scheduled_communication_id) {
      await admin
        .from("scheduled_communications")
        .update({ status: "cancelled", cancelled_at: now, updated_at: now })
        .eq("id", approval.scheduled_communication_id);
    }
    return NextResponse.json({ status: "rejected" });
  }

  try {
    const conversation = approval.conversation_id
      ? (
          await admin
            .from("conversations")
            .select("external_thread_id")
            .eq("id", approval.conversation_id)
            .eq("org_id", membership.org_id)
            .maybeSingle()
        ).data
      : null;
    const approvedContent = parsed.data.content || approval.content;
    const delivery = await deliverApprovedMessage({
      admin,
      orgId: membership.org_id,
      channel: approval.channel,
      recipient: approval.recipient,
      content: approvedContent,
      subject: approval.subject,
      threadId:
        approval.channel === "email"
          ? conversation?.external_thread_id || null
          : null,
    });
    if (approval.conversation_id) {
      const { data: sentMessage } = await admin.from("messages").insert({
        org_id: membership.org_id,
        conversation_id: approval.conversation_id,
        direction_in_out: "out",
        text: approvedContent,
        read_at: now,
        raw_json: {
          channel: approval.channel,
          automation_approval_id: approval.id,
          external_message_id: delivery.externalId,
          delivery_status: "sent",
        },
      }).select("id,created_at,direction_in_out,text,read_at,raw_json").single();
      await admin
        .from("conversations")
        .update({ last_message_at: now, updated_at: now })
        .eq("id", approval.conversation_id)
        .eq("org_id", membership.org_id);
      approval.sent_message = sentMessage;
    }
    await admin
      .from("automation_approvals")
      .update({
        status: "approved",
        decided_at: now,
        decided_by_user_id: user.id,
        delivery_metadata: {
          external_message_id: delivery.externalId,
          thread_id: delivery.threadId,
        },
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", "pending");
    if (approval.scheduled_communication_id) {
      await admin
        .from("scheduled_communications")
        .update({ status: "sent", sent_at: now, updated_at: now })
        .eq("id", approval.scheduled_communication_id);
    }
    if (
      approval.action_key === "booking_confirmation" &&
      approval.inspection_booking_id
    ) {
      await admin
        .from("inspection_bookings")
        .update({ confirmation_sent_at: now })
        .eq("id", approval.inspection_booking_id)
        .eq("org_id", membership.org_id);
    }
    return NextResponse.json({
      status: "approved",
      sent: true,
      message: approval.sent_message || null,
    });
  } catch (error) {
    console.error(
      "Automation approval delivery failed",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "The approved action could not be delivered" },
      { status: 502 },
    );
  }
}
