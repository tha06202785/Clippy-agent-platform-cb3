import { ShieldCheck } from "lucide-react";
import { AdminFeatureState } from "@/components/admin-feature-state";

export default function CompliancePage() {
  return (
    <AdminFeatureState
      title="Compliance review"
      description="Human review queue for policy-sensitive communications"
      icon={ShieldCheck}
      nextStep="A policy source and review workflow must be configured before incidents can be displayed here."
    />
  );
}
