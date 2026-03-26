import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  event_type: string;
  status: 'success' | 'error' | 'pending' | 'warning';
  payload?: any;
  response?: any;
  error_message?: string;
  duration_ms?: number;
  org_id?: string;
  lead_id?: string;
}

export function IntegrationLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    source: 'all',
    status: 'all',
    hours: '24'
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    error_rate: 0
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Mock data - in production this would be API call
      const mockLogs: LogEntry[] = [
        {
          id: 'log_1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          source: 'facebook',
          event_type: 'lead_capture',
          status: 'success',
          duration_ms: 245,
          payload: { lead_id: 'lead_123', name: 'John Smith' }
        },
        {
          id: 'log_2',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          source: 'email',
          event_type: 'parse_inquiry',
          status: 'success',
          duration_ms: 890,
          payload: { subject: 'Property Inquiry', from: 'jane@example.com' }
        },
        {
          id: 'log_3',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          source: 'openai',
          event_type: 'generate_reply',
          status: 'error',
          error_message: 'Rate limit exceeded',
          duration_ms: 1200
        },
        {
          id: 'log_4',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          source: 'webhook',
          event_type: 'qr_scan',
          status: 'success',
          duration_ms: 156
        }
      ];
      
      setLogs(mockLogs);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Mock stats
    setStats({
      total: 245,
      success: 230,
      error: 15,
      error_rate: 6.1
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-orange-500">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const exportLogs = () => {
    const csvContent = logs.map(log => 
      `${log.id},${log.timestamp},${log.source},${log.event_type},${log.status}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clippy-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('Logs exported');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{stats.error_rate}%</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select 
                value={filter.source}
                onValueChange={(value) => setFilter({...filter, source: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select 
                value={filter.status}
                onValueChange={(value) => setFilter({...filter, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select 
                value={filter.hours}
                onValueChange={(value) => setFilter({...filter, hours: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Hour</SelectItem>
                  <SelectItem value="24">Last 24 Hours</SelectItem>
                  <SelectItem value="168">Last 7 Days</SelectItem>
                  <SelectItem value="720">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium">{log.event_type}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {log.source} • {formatTimestamp(log.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(log.status)}
                      {log.duration_ms && (
                        <span className="text-sm text-muted-foreground">
                          {log.duration_ms}ms
                        </span>
                      )}
                      {expandedLog === log.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="border-t p-4 bg-muted/50">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-sm">Payload:</p>
                          <pre className="bg-background p-2 rounded text-xs overflow-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>

                        {log.response && (
                          <div>
                            <p className="font-medium text-sm">Response:</p>
                            <pre className="bg-background p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(log.response, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.error_message && (
                          <div>
                            <p className="font-medium text-sm text-red-600">Error:</p>
                            <p className="text-red-600 text-sm">{log.error_message}</p>
                          </div>
                        )}

                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>ID: {log.id}</span>
                          {log.lead_id && <span>Lead: {log.lead_id}</span>}
                          {log.org_id && <span>Org: {log.org_id}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
