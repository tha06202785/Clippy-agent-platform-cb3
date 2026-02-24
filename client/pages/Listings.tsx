import Layout from "@/components/Layout";
import Placeholder from "@/components/Placeholder";
import { FileText } from "lucide-react";

export default function ListingsPage() {
  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Listings</h1>
        <Placeholder
          title="Listings Management Coming Soon"
          description="Create, manage, and generate marketing content for your real estate listings. Generate AI-powered content packs and schedule social media posts."
          icon={FileText}
        />
      </div>
    </Layout>
  );
}
