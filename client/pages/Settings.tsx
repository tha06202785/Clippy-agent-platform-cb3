import Layout from "@/components/Layout";
import Placeholder from "@/components/Placeholder";
import { Cog } from "lucide-react";

export default function SettingsPage() {
  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-8 drop-shadow-lg">Settings</h1>
        <Placeholder
          title="Settings Coming Soon"
          description="Manage your account settings, preferences, and organization details. Configure notifications and customize your Clippy experience."
          icon={Cog}
        />
      </div>
    </Layout>
  );
}
