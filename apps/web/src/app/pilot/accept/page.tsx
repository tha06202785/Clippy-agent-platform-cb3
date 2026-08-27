import { redirect } from "next/navigation";
import { PilotAcceptance } from "@/components/pilot-acceptance";
import { createClient } from "@/lib/supabase/server";

export default async function PilotAcceptPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/sign-in?next=%2Fpilot%2Faccept");
  }

  return <PilotAcceptance email={user.email} />;
}
