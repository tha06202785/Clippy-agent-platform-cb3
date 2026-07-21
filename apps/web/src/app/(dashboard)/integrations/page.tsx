"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, 
  Mail, Calendar, MessageCircle, Instagram, Globe, Zap,
  Activity, Shield, Clock, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Integration {
  provider: string;
  name: string;
  description: string;
  icon: any;
  status: "healthy" | "warning" | "error" | "not_connected";
  connected: boolean;
  email?: string;
  lastSync?: string;
  itemsIndexed?: number;
  humanMessage?: string;
  canAutoRefresh?: boolean;
  action?: string;
  actionUrl?: string;
  permissions?: {
    granted: number;
    required: number;
    missing?: string[];
  };
}

const integrationConfig: Record<string, any> = {
  gmail: {
    name: "Gmail",
    description: "Read and send emails automatically",
    icon: Mail,
    color: "text-red-500",
    bgColor: "bg-red-50",
    connectUrl: "/api/integrations/google",
  },
  "google-calendar": {
    name: "Google Calendar",
    description: "Schedule inspections and meetings",
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    connectUrl: "/api/integrations/google",
  },
  facebook: {
    name: "Facebook",
    description: "Import leads from Messenger and Ads",
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    connectUrl: "/api/integrations/facebook",
  },
  instagram: {
    name: "Instagram",
    description: "Connect DMs and import leads",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    connectUrl: "/api/integrations/facebook",
  },
  whatsapp: {
    name: "WhatsApp Cloud API",
    description: "Message leads automatically",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
    connectUrl: "/api/integrations/whatsapp",
  },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations/status");
      const data = await response.json();
      
      // Map to our format
      const mapped = Object.entries(integrationConfig).map(([provider, config]: [string, any]) => {
        const existing = data.find((i: any) => i.provider === provider);
        return {
          provider,
          name: config.name,
          description: config.description,
          icon: config.icon,
          status: existing?.status || "not_connected",
          connected: existing?.status === "connected" || existing?.status === "healthy",
          email: existing?.email,
          lastSync: existing?.last_sync_at,
          itemsIndexed: existing?.items_indexed || 0,
          humanMessage: existing?.humanMessage,
          canAutoRefresh: existing?.canAutoRefresh,
          action: existing?.action,
          actionUrl: existing?.actionUrl,
          permissions: existing?.permissions,
        };
      });
      
      setIntegrations(mapped as Integration[]);
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (provider: string) => {
    setTesting(provider);
    try {
      const response = await fetch();
      const result = await response.json();
      
      // Update the integration with test result
      setIntegrations(prev => prev.map(int => 
        int.provider === provider 
          ? { ...int, ...result, status: result.success ? "healthy" : "error" }
          : int
      ));
      
      // Auto-refresh if possible
      if (!result.success && result.canAutoRefresh && result.action === "refresh") {
        await autoRefresh(provider);
      }
    } catch (error) {
      console.error("Test failed:", error);
    } finally {
      setTesting(null);
    }
  };

  const autoRefresh = async (provider: string) => {
    setRefreshing(provider);
    try {
      // Trigger refresh by calling test again (backend handles auto-refresh)
      await testConnection(provider);
    } finally {
      setRefreshing(null);
    }
  };

  const handleConnect = (provider: string) => {
    const config = integrationConfig[provider];
    if (config?.connectUrl) {
      window.location.href = config.connectUrl;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "warning": return "text-amber-600 bg-amber-50 border-amber-200";
      case "error": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy": return CheckCircle2;
      case "warning": return AlertCircle;
      case "error": return XCircle;
      default: return null;
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return ;
    if (hours < 24) return ;
    return ;
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  const healthyCount = integrations.filter(i => i.status === "healthy").length;
  const totalConnected = integrations.filter(i => i.connected).length;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite tools and let Clippy work automatically
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy Connections</CardTitle>
              <Activity className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthyCount} / {totalConnected}</div>
              <p className="text-xs text-muted-foreground">
                {totalConnected === integrations.length ? "All connected" : }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items Indexed</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.reduce((sum, i) => sum + (i.itemsIndexed || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Knowledge items learned
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {integrations.filter(i => i.lastSync).length > 0
                  ? formatLastSync(integrations.filter(i => i.lastSync)[0].lastSync)
                  : "Never"}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent activity
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Integration Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const StatusIcon = getStatusIcon(integration.status);
            const config = integrationConfig[integration.provider];
            
            return (
              <Card key={integration.provider} className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                integration.connected && "border-2"
              )}>
                {/* Status Badge */}
                <div className={cn(
                  "absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border",
                  getStatusColor(integration.status)
                )}>
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {integration.status === "healthy" && "Connected"}
                  {integration.status === "warning" && "Warning"}
                  {integration.status === "error" && "Error"}
                  {integration.status === "not_connected" && "Not Connected"}
                </div>

                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 rounded-xl", config.bgColor)}>
                      <Icon className={cn("w-6 h-6", config.color)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Connection Details */}
                  {integration.connected && (
                    <div className="space-y-2 text-sm">
                      {integration.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {integration.email}
                        </div>
                      )}
                      
                      {integration.itemsIndexed !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Activity className="w-4 h-4" />
                          {integration.itemsIndexed.toLocaleString()} items indexed
                        </div>
                      )}
                      
                      {integration.lastSync && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          Last synced {formatLastSync(integration.lastSync)}
                        </div>
                      )}
                      
                      {/* Permissions */}
                      {integration.permissions && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Permissions</span>
                            <span className="font-medium">
                              {integration.permissions.granted}/{integration.permissions.required} granted
                            </span>
                          </div>
                          <Progress 
                            value={(integration.permissions.granted / integration.permissions.required) * 100} 
                            className="h-2"
                          />
                          {integration.permissions.missing && integration.permissions.missing.length > 0 && (
                            <p className="text-xs text-amber-600">
                              Missing: {integration.permissions.missing.length} permissions
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Human Message */}
                      {integration.humanMessage && (
                        <div className={cn(
                          "p-3 rounded-lg text-sm",
                          integration.status === "healthy" 
                            ? "bg-emerald-50 text-emerald-800"
                            : integration.status === "error"
                            ? "bg-red-50 text-red-800"
                            : "bg-amber-50 text-amber-800"
                        )}>
                          {integration.humanMessage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Not Connected Message */}
                  {!integration.connected && !integration.humanMessage && (
                    <p className="text-sm text-muted-foreground">
                      Connect {integration.name} to enable automatic {integration.description.toLowerCase()}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {integration.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(integration.provider)}
                          disabled={testing === integration.provider}
                          className="flex-1"
                        >
                          {testing === integration.provider ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Test Connection
                        </Button>
                        
                        {integration.status === "error" && integration.canAutoRefresh && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => autoRefresh(integration.provider)}
                            disabled={refreshing === integration.provider}
                            className="flex-1"
                          >
                            {refreshing === integration.provider ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            Auto-Fix
                          </Button>
                        )}
                        
                        {integration.status === "error" && !integration.canAutoRefresh && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConnect(integration.provider)}
                            className="flex-1"
                          >
                            Reconnect
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(integration.provider)}
                        className="w-full"
                      >
                        Connect
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Need Help?
            </CardTitle>
            <CardDescription>
              Tips for setting up your integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-900">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>
                  <strong>Gmail:</strong> Make sure to grant all requested permissions for Clippy to read and send emails
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>
                  <strong>Google Calendar:</strong> Required for automatic inspection scheduling
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>
                  <strong>WhatsApp:</strong> You need a Meta Business Manager account with a verified phone number
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>
                  <strong>Facebook/Instagram:</strong> Connect your business pages to import leads from Messenger
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
