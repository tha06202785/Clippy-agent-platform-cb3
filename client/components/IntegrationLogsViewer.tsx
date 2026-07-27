import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Download, Filter, Activity, ArrowLeft } from 'lucide-react';
import { getAutomationLogs, AutomationLog } from '@/lib/dataService';
import { supabase } from '@/lib/supabase';

const SAMPLE_LOGS: any[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60000),
    source: 'facebook',
    status: 'success',
    action: 'Lead Capture',
    message: 'New lead captured from Facebook page',
    details: {
      leadName: 'John Doe',
      leadEmail: 'john@example.com',
      duration: 234,
    },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60000),
    source: 'email',
    status: 'success',
    action: 'Email Forwarded',
    message: 'Lead email forwarded to inbox',
    details: {
      leadEmail: 'jane@example.com',
      duration: 125,
    },
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 25 * 60000),
    source: 'openai',
    status: 'error',
    action: 'Content Generation',
    message: 'Failed to generate content',
    details: {
      errorMessage: 'API rate limit exceeded',
    },
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 45 * 60000),
    source: 'webhook',
    status: 'success',
    action: 'Webhook Received',
    message: 'Webhook event processed successfully',
    details: {
      duration: 89,
    },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60000),
    source: 'facebook',
    status: 'pending',
    action: 'Post Scheduled',
    message: 'Waiting for scheduled post time',
    details: {},
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 120 * 60000),
    source: 'email',
    status: 'success',
    action: 'Automated Response Sent',
    message: 'Auto-reply sent to lead',
    details: {
      leadEmail: 'bob@example.com',
      duration: 45,
    },
  },
];

interface LogEntry {
  id: string;
  timestamp: Date;
  source: string;
  status: 'success' | 'error' | 'pending';
  action: string;
  message: string;
  details?: {
    leadName?: string;
    leadEmail?: string;
    errorMessage?: string;
    duration?: number;
  };
}

export default function IntegrationLogsViewer() {
  const navigate = useNavigate();
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real logs from database
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          setUserId(session.user.id);
          const automationLogs = await getAutomationLogs(session.user.id, { limit: 50 });

          if (automationLogs && automationLogs.length > 0) {
            const mappedLogs: LogEntry[] = automationLogs.map(log => ({
              id: log.id,
              timestamp: new Date(log.created_at),
              source: log.source || 'webhook',
              status: log.status as 'success' | 'error' | 'pending',
              action: log.type,
              message: log.message || 'No details available',
            }));
            setLogs(mappedLogs);
          }
        }
      } catch (error) {
        console.error('Error loading automation logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (sourceFilter && log.source !== sourceFilter) return false;
    if (statusFilter && log.status !== statusFilter) return false;
    if (
      searchTerm &&
      !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.action.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'facebook':
        return '📘';
      case 'email':
        return '📧';
      case 'webhook':
        return '🔌';
      case 'openai':
        return '🤖';
      default:
        return '📌';
    }
  };

  const getStatusColor = (
    status: 'success' | 'error' | 'pending'
  ) => {
    switch (status) {
      case 'success':
        return 'border-green-400/50';
      case 'error':
        return 'border-red-400/50';
      case 'pending':
        return 'border-amber-400/50';
    }
  };

  const getStatusBg = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success':
        return 'bg-green-400/10';
      case 'error':
        return 'bg-red-400/10';
      case 'pending':
        return 'bg-amber-400/10';
    }
  };

  const getStatusBadge = (
    status: 'success' | 'error' | 'pending'
  ) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600/80 text-green-100">✓ Success</Badge>;
      case 'error':
        return <Badge className="bg-red-600/80 text-red-100">✗ Error</Badge>;
      case 'pending':
        return <Badge className="bg-amber-600/80 text-amber-100">⏳ Pending</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Source', 'Status', 'Action', 'Message'],
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.source,
        log.status,
        log.action,
        log.message,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', 'integration-logs.csv');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950">
      {/* Left Sidebar */}
      <div className="w-20 border-r-2 border-cyan-400/30 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-cyan-400/50 bg-slate-800/50 hover:bg-cyan-600/40 hover:border-cyan-400 text-cyan-300 transition-all hover:shadow-lg hover:shadow-cyan-500/30 group mb-8"
          title="Go Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Integration Logs
          </h1>
          <p className="text-cyan-200/80 text-lg drop-shadow">
            Monitor system activity and debug integration issues
          </p>
        </div>

        {/* Filters */}
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 mb-6" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
          <div className="relative p-6 z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-lg mb-4">
              <Filter className="w-5 h-5" />
              Filters
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-cyan-200 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by message or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-cyan-400/50 rounded-lg bg-slate-900/50 text-cyan-200 placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cyan-200 mb-2">Source</label>
                <select
                  value={sourceFilter || ''}
                  onChange={(e) => setSourceFilter(e.target.value || null)}
                  className="px-3 py-2 border-2 border-cyan-400/50 rounded-lg bg-slate-900/50 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="">All Sources</option>
                  <option value="facebook">Facebook</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-cyan-200 mb-2">Status</label>
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="px-3 py-2 border-2 border-cyan-400/50 rounded-lg bg-slate-900/50 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={exportLogs} 
                  className="bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 border-2 border-cyan-400/30 rounded-2xl bg-slate-800/30">
              <p className="text-cyan-200/60 font-semibold">No logs found matching your filters</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className={`cursor-pointer transition-all border-2 rounded-2xl backdrop-blur-sm p-4 ${getStatusColor(log.status)} ${getStatusBg(log.status)} hover:border-cyan-400/80 hover:shadow-lg hover:shadow-cyan-500/30`}
                onClick={() =>
                  setExpandedLog(expandedLog === log.id ? null : log.id)
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getSourceIcon(log.source)}</span>
                      <div>
                        <p className="font-semibold text-cyan-300">{log.action}</p>
                        <p className="text-sm text-cyan-200/70">{log.message}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(log.status)}
                    <div className="text-right">
                      <p className="text-xs text-cyan-200/60">{formatTime(log.timestamp)}</p>
                    </div>
                    <button className="text-cyan-400/60 hover:text-cyan-300">
                      {expandedLog === log.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t-2 border-cyan-400/20 space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Source</p>
                        <p className="text-sm text-cyan-300 mt-1 capitalize font-semibold">{log.source}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Timestamp</p>
                        <p className="text-sm text-cyan-300 mt-1 font-semibold">{log.timestamp.toLocaleString()}</p>
                      </div>
                    </div>

                    {log.details?.leadName && (
                      <div>
                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Lead Name</p>
                        <p className="text-sm text-cyan-300 mt-1">{log.details.leadName}</p>
                      </div>
                    )}

                    {log.details?.leadEmail && (
                      <div>
                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Lead Email</p>
                        <p className="text-sm text-cyan-300 mt-1">{log.details.leadEmail}</p>
                      </div>
                    )}

                    {log.details?.errorMessage && (
                      <div className="bg-red-900/30 border-2 border-red-400/50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-300 uppercase tracking-widest">Error Details</p>
                        <p className="text-sm text-red-200 mt-1">{log.details.errorMessage}</p>
                      </div>
                    )}

                    {log.details?.duration && (
                      <div>
                        <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Duration</p>
                        <p className="text-sm text-cyan-300 mt-1 font-mono">{log.details.duration}ms</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-cyan-200 uppercase tracking-widest">Full Message</p>
                      <p className="text-sm text-cyan-300 mt-1 font-mono bg-slate-900/50 p-2 rounded border border-cyan-400/20">
                        {log.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {[
            { label: 'Successful', value: filteredLogs.filter(l => l.status === 'success').length, color: 'from-green-500 to-green-600' },
            { label: 'Errors', value: filteredLogs.filter(l => l.status === 'error').length, color: 'from-red-500 to-red-600' },
            { label: 'Pending', value: filteredLogs.filter(l => l.status === 'pending').length, color: 'from-amber-500 to-amber-600' },
            { label: 'Total Logs', value: filteredLogs.length, color: 'from-cyan-500 to-blue-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 hover:-translate-y-2"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)',
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10 text-center">
                <p className="text-4xl font-black text-cyan-300 tabular-nums drop-shadow-lg mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-cyan-200/80 font-bold uppercase tracking-widest drop-shadow">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
