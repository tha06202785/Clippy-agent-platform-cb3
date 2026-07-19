"use client";
import { useEffect, useState } from "react";
import { Clock, Upload, CheckCircle, Zap, Brain, MessageCircle, Calendar, Mail } from "lucide-react";

const iconMap: Record<string, any> = {
  imported_contacts: Upload,
  connected_gmail: Mail,
  connected_calendar: Calendar,
  connected_facebook: MessageCircle,
  learned_brand_voice: Brain,
  indexed_documents: Brain,
  auto_learning_complete: Zap,
  knowledge_created: Brain,
  integration_sync: CheckCircle,
};

const categoryColors: Record<string, string> = {
  onboarding: "bg-blue-500",
  integration: "bg-emerald-500",
  knowledge: "bg-purple-500",
  ai_action: "bg-amber-500",
};

export function ActivityTimeline() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity?limit=50")
      .then(r => r.json())
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading activity...</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: any, i) => {
        const Icon = iconMap[activity.action] || Clock;
        const color = categoryColors[activity.category] || "bg-gray-500";
        
        return (
          <div key={activity.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={"w-10 h-10 rounded-full " + color + " flex items-center justify-center"}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {i < activities.length - 1 && (
                <div className="w-0.5 flex-1 bg-border my-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">{activity.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString()}
                </span>
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              )}
              {activity.impact_summary && (
                <p className="text-xs text-primary mt-2 font-medium">{activity.impact_summary}</p>
              )}
            </div>
          </div>
        );
      })}
      {activities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No activity yet</p>
          <p className="text-xs mt-1">Activities will appear here as Clippy learns your agency</p>
        </div>
      )}
    </div>
  );
}
