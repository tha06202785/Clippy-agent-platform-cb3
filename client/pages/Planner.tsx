import Layout from "@/components/Layout";
import Placeholder from "@/components/Placeholder";
import { Calendar } from "lucide-react";

export default function PlannerPage() {
  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Planner</h1>
        <Placeholder
          title="Calendar & Planning Coming Soon"
          description="Visualize and manage your tasks and scheduled content in a calendar view. Plan ahead and stay organized with drag-and-drop scheduling."
          icon={Calendar}
        />
      </div>
    </Layout>
  );
}
