import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, Download, Upload } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? '✓ Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integration Center</h1>
          <p className="text-gray-600 mt-2">Connect your favorite tools and platforms</p>
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
                <p className="text-sm text-gray-600">
                  Connect your Facebook business page to automate lead capture and post scheduling
                </p>
                <Button
                  onClick={handleFacebookConnect}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Connect Facebook
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Connected Page</p>
                  <p className="text-sm text-gray-900 font-semibold mb-1">{integrations.facebook.pageName}</p>
                  <p className="text-xs text-gray-500">ID: {integrations.facebook.pageId}</p>
                </div>
                <Button
                  onClick={handleFacebookDisconnect}
                  variant="destructive"
                  className="w-full"
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
            isConnected={integrations.email.connected}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forwarding Address
                </label>
                <div className="flex gap-2">
                  <Input
                    value={integrations.email.forwardingEmail}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    onClick={() =>
                      copyToClipboard(integrations.email.forwardingEmail, 'email')
                    }
                    variant="outline"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copiedField === 'email' && (
                  <p className="text-xs text-green-600 mt-1">✓ Copied!</p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
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
                <p className="text-sm text-gray-600 mb-4">
                  Connect your calendar to automatically schedule showings and follow-ups
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleCalendarConnect('google')}
                    variant="outline"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google Calendar
                  </Button>
                  <Button
                    onClick={() => handleCalendarConnect('outlook')}
                    variant="outline"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.6 2h-8c-.6 0-1 .5-1 1v18c0 .5.4 1 1 1h8v-2h-7V3h7V2z" />
                      <path d="M19 8h-7V7h-2v9h2v-5h7v5h2V8h-2z" />
                    </svg>
                    Outlook Calendar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Connected Calendar</p>
                  <p className="text-sm text-gray-900 font-semibold mb-1">
                    {integrations.calendar.type === 'google'
                      ? 'Google Calendar'
                      : 'Outlook Calendar'}
                  </p>
                  <p className="text-xs text-gray-500">{integrations.calendar.email}</p>
                </div>
                <Button
                  onClick={handleCalendarDisconnect}
                  variant="destructive"
                  className="w-full"
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
                <p className="text-sm text-gray-600 mb-4">
                  Connect your CRM to automatically sync leads and track sales
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleCRMConnect('hubspot')}
                    variant="outline"
                    className="text-xs"
                  >
                    HubSpot
                  </Button>
                  <Button
                    onClick={() => handleCRMConnect('salesforce')}
                    variant="outline"
                    className="text-xs"
                  >
                    Salesforce
                  </Button>
                  <Button
                    onClick={() => handleCRMConnect('pipedrive')}
                    variant="outline"
                    className="text-xs"
                  >
                    Pipedrive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Connected CRM</p>
                  <p className="text-sm text-gray-900 font-semibold capitalize">
                    {integrations.crm.type}
                  </p>
                </div>
                <Button
                  onClick={handleCRMDisconnect}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            )}
          </IntegrationCard>
        </div>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export and import your Clippy data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={exportData}
                variant="outline"
                className="h-auto flex-col items-start p-4 text-left"
              >
                <Download className="w-6 h-6 mb-2 text-blue-600" />
                <span className="font-semibold text-sm">Export Data</span>
                <span className="text-xs text-gray-500 mt-1">Download your leads and settings</span>
              </Button>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Import Data</p>
                <p className="text-xs text-gray-500 mt-1">Coming Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
