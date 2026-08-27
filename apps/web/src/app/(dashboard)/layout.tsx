import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";
import { PilotExpiryGuard } from "@/components/pilot-expiry-guard";
import {
  isPilotInviteActive,
  type PilotInviteRecord,
} from "@/lib/pilot-invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let pilotTrialEndsAt: string | null = null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pilot_invites")
      .select("id,status,expires_at,trial_ends_at")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const invite = data as Pick<
      PilotInviteRecord,
      "id" | "status" | "expires_at" | "trial_ends_at"
    > | null;

    if (invite?.status === "pending") {
      redirect(isPilotInviteActive(invite) ? "/pilot/accept" : "/pilot/ended");
    }
    if (invite?.status === "accepted") {
      if (!isPilotInviteActive(invite)) {
        const { error } = await admin.rpc("expire_pilot_invite", {
          p_invite_id: invite.id,
        });
        if (error) console.error("Expired pilot cleanup failed", error.code);
        redirect("/pilot/ended");
      }
      pilotTrialEndsAt = invite.trial_ends_at;
    }
    if (invite && ["revoked", "expired"].includes(invite.status)) {
      redirect("/pilot/ended");
    }
  }

  return (
    <DashboardLayout>
      {pilotTrialEndsAt ? (
        <PilotExpiryGuard expiresAt={pilotTrialEndsAt}>
          {children}
        </PilotExpiryGuard>
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
