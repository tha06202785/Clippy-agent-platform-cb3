import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  action: z.enum(["complete", "reschedule"]),
  due_at: z.string().datetime().optional(),
});

async function taskContext(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, orgId: null, task: null };

  const { data: membership } = await supabase
    .from("user_org_roles")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) return { supabase, orgId: null, task: null };

  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  return { supabase, orgId: membership.org_id, task };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task update" }, { status: 400 });
  }
  if (parsed.data.action === "reschedule" && !parsed.data.due_at) {
    return NextResponse.json(
      { error: "A new reminder time is required" },
      { status: 400 },
    );
  }

  const { supabase, orgId, task } = await taskContext(id);
  if (!orgId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!task) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  const update =
    parsed.data.action === "complete"
      ? { status: "completed", completed_at: new Date().toISOString() }
      : { status: "pending", due_at: parsed.data.due_at, completed_at: null };
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id,status,due_at")
    .single();
  if (error) {
    console.error("Follow-up update failed", error.code);
    return NextResponse.json(
      { error: "Follow-up could not be updated" },
      { status: 500 },
    );
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid task" }, { status: 400 });
  }
  const { supabase, orgId, task } = await taskContext(id);
  if (!orgId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!task) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) {
    console.error("Follow-up cancellation failed", error.code);
    return NextResponse.json(
      { error: "Follow-up could not be cancelled" },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
