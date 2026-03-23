import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Download, Filter } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  source: 'facebook' | 'email' | 'webhook' | 'openai';
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

const SAMPLE_LOGS: LogEntry[] = [
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

export default function IntegrationLogsViewer() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    return SAMPLE_LOGS.filter(log => {
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
  }, [sourceFilter, statusFilter, searchTerm]);

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
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusBadge = (
    status: 'success' | 'error' | 'pending'
  ) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600">✓ Success</Badge>;
      case 'error':
        return <Badge variant="destructive">✗ Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">⏳ Pending</Badge>;
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integration Logs</h1>
          <p className="text-gray-600 mt-2">Monitor system activity and debug integration issues</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by message or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <select
                  value={sourceFilter || ''}
                  onChange={(e) => setSourceFilter(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sources</option>
                  <option value="facebook">Facebook</option>
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Export */}
              <div className="flex items-end">
                <Button onClick={exportLogs} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No logs found matching your filters</p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map(log => (
              <Card
                key={log.id}
                className={`cursor-pointer transition-all ${getStatusColor(log.status)}`}
                onClick={() =>
                  setExpandedLog(expandedLog === log.id ? null : log.id)
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getSourceIcon(log.source)}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{log.action}</p>
                          <p className="text-sm text-gray-600">{log.message}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(log.status)}
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{formatTime(log.timestamp)}</p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
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
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase">
                              Source
                            </p>
                            <p className="text-sm text-gray-600 capitalize mt-1">
                              {log.source}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase">
                              Timestamp
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {log.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {log.details?.leadName && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase">
                              Lead Name
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {log.details.leadName}
                            </p>
                          </div>
                        )}

                        {log.details?.leadEmail && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase">
                              Lead Email
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {log.details.leadEmail}
                            </p>
                          </div>
                        )}

                        {log.details?.errorMessage && (
                          <div className="bg-red-100 border border-red-300 rounded p-3">
                            <p className="text-xs font-semibold text-red-800 uppercase">
                              Error Details
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              {log.details.errorMessage}
                            </p>
                          </div>
                        )}

                        {log.details?.duration && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 uppercase">
                              Duration
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {log.details.duration}ms
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold text-gray-700 uppercase">
                            Full Message
                          </p>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-gray-100 p-2 rounded">
                            {log.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {filteredLogs.filter(l => l.status === 'success').length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Successful</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.status === 'error').length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Errors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {filteredLogs.filter(l => l.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {filteredLogs.length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Logs</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
