import { Settings } from "lucide-react";
import { AdminFeatureState } from "@/components/admin-feature-state";

export default function AdminSettingsPage() {
  return (
    <AdminFeatureState
      title="Agency settings"
      description="Organisation identity, controls, and workspace defaults"
      icon={Settings}
      nextStep="Settings remain read-only until organisation profile persistence and change auditing are connected."
    />
  );
}
