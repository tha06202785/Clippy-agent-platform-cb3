import { Building2 } from "lucide-react";
import { AdminFeatureState } from "@/components/admin-feature-state";

export default function OfficesPage() {
  return (
    <AdminFeatureState
      title="Offices"
      description="Office-level reporting and permissions"
      icon={Building2}
      nextStep="Connect an office directory or property-management source before this module is enabled."
    />
  );
}
