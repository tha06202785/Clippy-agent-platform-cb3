// ============================================================================
// AI Tools Panel Component
// Connects to AI API routes
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api";
import { Sparkles, MessageSquare, FileText, Mic, Bot, Loader2 } from "lucide-react";

interface AIToolsPanelProps {
  orgId: string;
}

export default function AIToolsPanel({ orgId }: AIToolsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const tools = [
    {
      id: "draft-reply",
      name: "AI Reply",
      description: "Generate intelligent replies to leads",
      icon: MessageSquare,
      action: async () => {
        setLoading("draft-reply");
        try {
          const res = await aiApi.draftReply("conv_123", { tone: "professional" });
          setResult(res.data);
        } catch (e) {
          console.error(e);
        }
        setLoading(null);
      },
    },
    {
      id: "generate-listing",
      name: "Listing Generator",
      description: "Create stunning property listings",
      icon: FileText,
      action: async () => {
        setLoading("generate-listing");
        try {
          const res = await aiApi.generateListing({
            address: "123 Main St",
            suburb: "Melbourne",
            bedrooms: 3,
            bathrooms: 2,
            features: ["pool", "garage"],
          });
          setResult(res.data);
        } catch (e) {
          console.error(e);
        }
        setLoading(null);
      },
    },
    {
      id: "transcribe",
      name: "Voice Transcription",
      description: "Transcribe voice notes to text",
      icon: Mic,
      action: async () => {
        setLoading("transcribe");
        // Would need audio file
        setLoading(null);
      },
    },
    {
      id: "qualify",
      name: "Lead Qualification",
      description: "AI-powered lead scoring",
      icon: Bot,
      action: async () => {
        setLoading("qualify");
        try {
          const res = await aiApi.qualifyLead("lead_123", "Interested in buying");
          setResult(res.data);
        } catch (e) {
          console.error(e);
        }
        setLoading(null);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold">AI Tools</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="glass rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group"
            onClick={tool.action}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                {loading === tool.id ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                ) : (
                  <tool.icon className="w-5 h-5 text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                  {tool.name}
                </h4>
                <p className="text-sm text-white/60">{tool.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div className="glass rounded-xl p-4 mt-4">
          <h4 className="font-medium text-white mb-2">Result:</h4>
          <pre className="text-sm text-white/70 overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
