import Layout from "@/components/Layout";
import Placeholder from "@/components/Placeholder";
import { Settings } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-8 drop-shadow-lg">Integrations</h1>
        <Placeholder
          title="Integrations Coming Soon"
          description="Connect and manage your external services. Integrate with Facebook, Instagram, WhatsApp, and other platforms to power your real estate workflow."
          icon={Settings}
        />
      </div>
    </Layout>
  );
}
