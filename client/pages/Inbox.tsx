import Layout from "@/components/Layout";
import Placeholder from "@/components/Placeholder";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Lead Inbox</h1>
        <Placeholder
          title="Lead Inbox Coming Soon"
          description="Manage all your lead communications in one place. View conversation timelines, send messages, and track lead progression."
          icon={Inbox}
        />
      </div>
    </Layout>
  );
}
