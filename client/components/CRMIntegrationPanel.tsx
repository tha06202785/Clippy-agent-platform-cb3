import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Download, Upload, Plug, ArrowLeft } from 'lucide-react';

interface IntegrationStatus {
  facebook: {
    connected: boolean;
    pageId: string;
    pageName: string;
    accessToken: string;
  };
  email: {
    connected: boolean;
    forwardingEmail: string;
  };
  calendar: {
    connected: boolean;
    type: 'google' | 'outlook' | 'none';
    email: string;
  };
  crm: {
    connected: boolean;
    type: 'salesforce' | 'pipedrive' | 'hubspot' | 'none';
  };
}

export default function CRMIntegrationPanel() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    facebook: {
      connected: false,
      pageId: '',
      pageName: '',
      accessToken: '',
    },
    email: {
      connected: false,
      forwardingEmail: 'agent-12345@clippy.io',
    },
    calendar: {
      connected: false,
      type: 'none',
      email: '',
    },
    crm: {
      connected: false,
      type: 'none',
    },
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFacebookConnect = () => {
    setIntegrations(prev => ({
      ...prev,
      facebook: {
        ...prev.facebook,
        connected: true,
        pageId: 'PAGE_123456789',
        pageName: 'My Real Estate Agency',
      },
    }));
  };

  const handleFacebookDisconnect = () => {
    setIntegrations(prev => ({
      ...prev,
      facebook: {
        connected: false,
        pageId: '',
        pageName: '',
        accessToken: '',
      },
    }));
  };

  const handleCalendarConnect = (type: 'google' | 'outlook') => {
    setIntegrations(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        connected: true,
        type,
        email: 'user@example.com',
      },
    }));
  };

  const handleCalendarDisconnect = () => {
    setIntegrations(prev => ({
      ...prev,
      calendar: {
        connected: false,
        type: 'none',
        email: '',
      },
    }));
  };

  const handleCRMConnect = (type: 'salesforce' | 'pipedrive' | 'hubspot') => {
    setIntegrations(prev => ({
      ...prev,
      crm: {
        ...prev.crm,
        connected: true,
        type,
      },
    }));
  };

  const handleCRMDisconnect = () => {
    setIntegrations(prev => ({
      ...prev,
      crm: {
        connected: false,
        type: 'none',
      },
    }));
  };

  const exportData = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      integrations: {
        facebook: integrations.facebook.connected ? 'Connected' : 'Not Connected',
        email: integrations.email.connected ? 'Connected' : 'Not Connected',
        calendar: integrations.calendar.connected ? 'Connected' : 'Not Connected',
        crm: integrations.crm.connected ? 'Connected' : 'Not Connected',
      },
      leads: [
        { id: 1, name: 'John Doe', email: 'john@example.com', source: 'Facebook' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', source: 'Email' },
      ],
    };

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    );
    element.setAttribute('download', 'clippy-export.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const IntegrationCard = ({
    title,
    icon,
    description,
    isConnected,
    children,
  }: {
    title: string;
    icon: string;
    description: string;
    isConnected: boolean;
    children: React.ReactNode;
  }) => (
    <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
      <div className="relative p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="font-black text-cyan-300 text-lg">{title}</p>
              <p className="text-sm text-cyan-200/70">{description}</p>
            </div>
          </div>
          <Badge className={isConnected ? 'bg-green-600/80 text-green-100' : 'bg-gray-600/80 text-gray-100'}>
            {isConnected ? '✓ Connected' : 'Disconnected'}
          </Badge>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            Integration Center
          </h1>
          <p className="text-cyan-200/80 text-lg drop-shadow">
            Connect your favorite tools and platforms
          </p>
        </div>

        {/* Primary Integrations */}
        <div className="space-y-6 mb-8">
          {/* Facebook Integration */}
          <IntegrationCard
            title="Facebook Pages"
            icon="📘"
            description="Connect your Facebook business pages for automated posting"
            isConnected={integrations.facebook.connected}
          >
            {!integrations.facebook.connected ? (
              <div className="space-y-4">
                <p className="text-sm text-cyan-200/80">
                  Connect your Facebook business page to automate lead capture and post scheduling
                </p>
                <Button
                  onClick={handleFacebookConnect}
                  className="w-full bg-cyan-600/80 hover:bg-cyan-700 text-white font-semibold"
                >
                  Connect Facebook
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-cyan-900/30 border-2 border-cyan-400/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-cyan-300 mb-2">Connected Page</p>
                  <p className="text-sm text-cyan-200 font-semibold mb-1">{integrations.facebook.pageName}</p>
                  <p className="text-xs text-cyan-200/60">ID: {integrations.facebook.pageId}</p>
                </div>
                <Button
                  onClick={handleFacebookDisconnect}
                  variant="destructive"
                  className="w-full bg-red-600/80 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}
          </IntegrationCard>

          {/* Email Integration */}
          <IntegrationCard
            title="Email Forwarding"
            icon="📧"
            description="Unique email address for lead capture"
            isConnected={true}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cyan-200 mb-2">
                  Forwarding Address
                </label>
                <div className="flex gap-2">
                  <Input
                    value={integrations.email.forwardingEmail}
                    readOnly
                    className="bg-slate-900/50 border-2 border-cyan-400/30 text-cyan-300"
                  />
                  <Button
                    onClick={() =>
                      copyToClipboard(integrations.email.forwardingEmail, 'email')
                    }
                    className="bg-cyan-600/80 hover:bg-cyan-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copiedField === 'email' && (
                  <p className="text-xs text-green-400 mt-2">✓ Copied!</p>
                )}
              </div>
              <div className="bg-green-900/30 border-2 border-green-400/30 rounded-lg p-3">
                <p className="text-xs text-green-300 font-semibold">
                  Use this email to capture leads from listings, ads, and marketing materials.
                </p>
              </div>
            </div>
          </IntegrationCard>

          {/* Calendar Integration */}
          <IntegrationCard
            title="Calendar"
            icon="📅"
            description="Schedule showings and follow-ups"
            isConnected={integrations.calendar.connected}
          >
            {!integrations.calendar.connected ? (
              <div className="space-y-3">
                <p className="text-sm text-cyan-200/80 mb-4">
                  Connect your calendar to automatically schedule showings and follow-ups
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleCalendarConnect('google')}
                    className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold"
                    variant="outline"
                  >
                    Google Calendar
                  </Button>
                  <Button
                    onClick={() => handleCalendarConnect('outlook')}
                    className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold"
                    variant="outline"
                  >
                    Outlook Calendar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-cyan-900/30 border-2 border-cyan-400/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-cyan-300 mb-1">Connected Calendar</p>
                  <p className="text-sm text-cyan-200 font-semibold mb-1">
                    {integrations.calendar.type === 'google'
                      ? 'Google Calendar'
                      : 'Outlook Calendar'}
                  </p>
                  <p className="text-xs text-cyan-200/60">{integrations.calendar.email}</p>
                </div>
                <Button
                  onClick={handleCalendarDisconnect}
                  variant="destructive"
                  className="w-full bg-red-600/80 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}
          </IntegrationCard>

          {/* CRM Integration */}
          <IntegrationCard
            title="CRM"
            icon="🎯"
            description="Sync leads with your CRM"
            isConnected={integrations.crm.connected}
          >
            {!integrations.crm.connected ? (
              <div className="space-y-3">
                <p className="text-sm text-cyan-200/80 mb-4">
                  Connect your CRM to automatically sync leads and track sales
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleCRMConnect('hubspot')}
                    className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold text-sm"
                    variant="outline"
                  >
                    HubSpot
                  </Button>
                  <Button
                    onClick={() => handleCRMConnect('salesforce')}
                    className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold text-sm"
                    variant="outline"
                  >
                    Salesforce
                  </Button>
                  <Button
                    onClick={() => handleCRMConnect('pipedrive')}
                    className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold text-sm"
                    variant="outline"
                  >
                    Pipedrive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-cyan-900/30 border-2 border-cyan-400/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-cyan-300 mb-1">Connected CRM</p>
                  <p className="text-sm text-cyan-200 font-semibold capitalize">
                    {integrations.crm.type}
                  </p>
                </div>
                <Button
                  onClick={handleCRMDisconnect}
                  variant="destructive"
                  className="w-full bg-red-600/80 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}
          </IntegrationCard>
        </div>

        {/* Data Management */}
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
          <div className="relative p-6 z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-2 drop-shadow-lg mb-6">
              <Plug className="w-5 h-5" />
              Data Management
            </h3>
            <p className="text-sm text-cyan-200/80 mb-4">Export and import your Clippy data</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={exportData}
                className="border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20 font-semibold h-auto flex-col items-start p-4 text-left"
                variant="outline"
              >
                <Download className="w-6 h-6 mb-2" />
                <span className="font-black">Export Data</span>
                <span className="text-xs text-cyan-200/60 font-normal">Download your leads and settings</span>
              </Button>
              <div className="border-2 border-dashed border-cyan-400/30 rounded-lg p-4 text-center">
                <Upload className="w-6 h-6 mx-auto mb-2 text-cyan-400/40" />
                <p className="text-sm font-semibold text-cyan-300">Import Data</p>
                <p className="text-xs text-cyan-200/60 mt-1">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
