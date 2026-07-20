"use client";
import { useEffect, useState } from "react";
import { Brain, Building2, User, Users, Upload, Search, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";

const layerColors = {
  real_estate_shared: "bg-blue-500",
  agency_private: "bg-purple-500",
  agent_private: "bg-emerald-500",
  client_memory: "bg-amber-500",
};

const layerIcons = {
  real_estate_shared: Brain,
  agency_private: Building2,
  agent_private: User,
  client_memory: Users,
};

const layerNames = {
  real_estate_shared: "Real Estate Knowledge",
  agency_private: "Agency Brain",
  agent_private: "Agent Profile",
  client_memory: "Client Memory",
};

export default function KnowledgeDashboard() {
  const [knowledge, setKnowledge] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [agentProfile, setAgentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/knowledge?limit=100").then(r => r.json()),
      fetch("/api/integrations/status").then(r => r.json()),
      fetch("/api/agent-profile").then(r => r.json()),
    ]).then(([knowledgeData, integrationData, profileData]) => {
      setKnowledge(knowledgeData);
      setIntegrations(integrationData);
      setAgentProfile(profileData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    const res = await fetch("/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, top_k: 10 }),
    });
    const data = await res.json();
    setSearchResults(data.results || []);
  };

  const stats = {
    total: knowledge.length,
    byLayer: knowledge.reduce((acc: any, doc: any) => {
      acc[doc.layer] = (acc[doc.layer] || 0) + 1;
      return acc;
    }, {}),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your AI team member&apos;s brain</p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search your knowledge base..."
          className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Search Results ({searchResults.length})</h2>
          {searchResults.map((doc: any) => (
            <div key={doc.id} className="p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                </div>
                <span className={"px-2 py-1 rounded text-xs font-medium text-white " + layerColors[doc.layer as keyof typeof layerColors]}>
                  {layerNames[doc.layer as keyof typeof layerNames]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Four Brains Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(layerNames) as Array<keyof typeof layerNames>).map((layer) => {
          const Icon = layerIcons[layer];
          const count = stats.byLayer[layer] || 0;
          return (
            <div key={layer} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={"w-12 h-12 rounded-xl " + layerColors[layer] + " flex items-center justify-center"}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{layerNames[layer]}</h3>
                  <p className="text-2xl font-bold text-primary">{count}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                <span>Healthy & Indexed</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Integration Health */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Integration Health
        </h2>
        <div className="space-y-3">
          {integrations.map((integration: any) => (
            <div key={integration.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className={"w-3 h-3 rounded-full " + (
                  integration.status === "healthy" ? "bg-emerald-500" :
                  integration.status === "warning" ? "bg-amber-500" : "bg-red-500"
                )} />
                <div>
                  <p className="font-medium text-foreground capitalize">{integration.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.items_indexed || 0} items indexed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {integration.last_sync_at ? "Synced " + new Date(integration.last_sync_at).toLocaleDateString() : "Never synced"}
                </span>
                <button className="text-primary hover:underline">Reconnect</button>
              </div>
            </div>
          ))}
          {integrations.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No integrations connected yet</p>
          )}
        </div>
      </div>

      {/* Agent Profile Summary */}
      {agentProfile && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Your AI Profile
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Communication Tone</p>
              <p className="font-medium text-foreground capitalize">{(agentProfile as any)?.communication_tone || "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confidence Score</p>
              <p className="font-medium text-foreground">{(agentProfile as any)?.confidence_score || 50}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Corrections Made</p>
              <p className="font-medium text-foreground">{(agentProfile as any)?.corrections_made || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-foreground capitalize">{(agentProfile as any)?.status}</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Knowledge Statistics</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Documents</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{integrations.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Integrations</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{agentProfile?.corrections_made || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Teach Clippy Actions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
