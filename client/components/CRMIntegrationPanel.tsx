import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  RefreshCw, 
  Download, 
  Upload,
  AlertCircle,
  CheckCircle2,
  Building2,
  Facebook,
  Mail,
  Calendar,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

interface CRMConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'not_connected' | 'error';
  lastSync?: string;
  recordCount?: number;
  icon: React.ReactNode;
}

export function CRMIntegrationPanel() {
  const [connections, setConnections] = useState<CRMConnection[]>([
    {
      id: 'facebook',
      name: 'Facebook',
      type: 'social',
      status: 'not_connected',
      icon: <Facebook className="h-5 w-5 text-blue-600" />
    },
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      status: 'not_connected',
      icon: <Mail className="h-5 w-5 text-gray-600" />
    },
    {
      id: 'calendar',
      name: 'Calendar',
      type: 'calendar',
      status: 'not_connected',
      icon: <Calendar className="h-5 w-5 text-red-500" />
    }
  ]);

  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const progress = Math.round((connectedCount / connections.length) * 100);

  const connect = async (id: string) => {
    try {
      // Simulate connection
      toast.success(`Connecting to ${id}...`);
      
      // Update connection status
      setConnections(connections.map(c => 
        c.id === id ? { 
          ...c, 
          status: 'connected',
          lastSync: new Date().toISOString(),
          recordCount: Math.floor(Math.random() * 500)
        } : c
      ));
    } catch (error) {
      toast.error('Connection failed');
    }
  };

  const disconnect = (id: string) => {
    setConnections(connections.map(c => 
      c.id === id ? { 
        ...c, 
        status: 'not_connected',
        lastSync: undefined,
        recordCount: undefined
      } : c
    ));
    toast.success('Disconnected');
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnections(connections.map(c => 
        c.status === 'connected' ? {
          ...c,
          lastSync: new Date().toISOString()
        } : c
      ));
      
      toast.success('Sync completed!');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'not_connected':
        return <Badge variant="secondary">Not Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect your existing tools to Clippy
              </CardDescription>
            </div>
            <Badge variant="outline">{connectedCount}/{connections.length} Connected</Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {connection.icon}
                <div>
                  <p className="font-medium">{connection.name}</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(connection.status)}
                    {connection.recordCount && (
                      <span className="text-sm text-muted-foreground">
                        {connection.recordCount} records
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {connection.status === 'connected' ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnect(connection.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => connect(connection.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ))}

          {connectedCount > 0 && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={syncAll}
              disabled={syncing}
            >
              {syncing ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Sync All Integrations</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="import">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-2" />Import Data</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-4 w-4 mr-2" />Export Data</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import from File</CardTitle>
              <CardDescription>
                Import leads from CSV, Excel, or other CRM exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">CSV, Excel, or JSON files</p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium text-sm mb-2">Supported Formats:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Salesforce CSV export</li>
                  <li>• HubSpot contacts</li>
                  <li>• AgentBox export</li>
                  <li>• Generic CSV with name, email, phone</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Export your Clippy data for backup or migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Leads</p>
                    <p className="text-sm text-muted-foreground">Export all leads and contacts</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Conversations</p>
                    <p className="text-sm text-muted-foreground">Export all messages and emails</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Full Backup</p>
                    <p className="text-sm text-muted-foreground">Export all data</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Database className="h-4 w-4 mr-1" />
                    Export All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
