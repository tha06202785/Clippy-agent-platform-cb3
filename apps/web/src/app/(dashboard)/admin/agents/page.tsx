import { Users } from "lucide-react";
import { AdminFeatureState } from "@/components/admin-feature-state";

export default function AgentsPage() {
  return (
    <AdminFeatureState
      title="Team access"
      description="Roles, invitations, and organisation membership"
      icon={Users}
      nextStep="The next release will connect this view to live organisation memberships and an audited invitation flow."
    />
  );
}
