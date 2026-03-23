import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: Date;
  status: 'scheduled' | 'posted' | 'cancelled';
  image?: string;
}

interface PendingApproval {
  id: string;
  content: string;
  submittedBy: string;
  submittedAt: Date;
  leadInfo?: {
    name: string;
    email: string;
    property: string;
  };
}

const SAMPLE_SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: '1',
    content: '🏡 Beautiful 3BR/2BA home at 123 Oak St. $450K. Schedule your tour today!',
    scheduledTime: new Date(Date.now() + 2 * 3600000),
    status: 'scheduled',
  },
  {
    id: '2',
    content: '✨ New listing alert! Luxury home with pool. Contact us for exclusive preview. 📞',
    scheduledTime: new Date(Date.now() + 6 * 3600000),
    status: 'scheduled',
  },
  {
    id: '3',
    content: '🎉 Congratulations to our clients on closing! Ready to help you find your dream home.',
    scheduledTime: new Date(Date.now() - 2 * 3600000),
    status: 'posted',
  },
];

const SAMPLE_PENDING_APPROVALS: PendingApproval[] = [
  {
    id: '1',
    content: 'New lead inquiry: Can you tell me more about the property at 456 Elm St?',
    submittedBy: 'System',
    submittedAt: new Date(Date.now() - 10 * 60000),
    leadInfo: {
      name: 'John Smith',
      email: 'john@example.com',
      property: '456 Elm St',
    },
  },
  {
    id: '2',
    content: 'Lead follow-up: Thanks for your interest! When would you like to schedule a showing?',
    submittedBy: 'AI Agent',
    submittedAt: new Date(Date.now() - 25 * 60000),
    leadInfo: {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      property: '789 Main Ave',
    },
  },
];

export default function FacebookAutomationDashboard() {
  const [autoPost, setAutoPost] = useState(true);
  const [autoReply, setAutoReply] = useState(true);
  const [ceoApproval, setCeoApproval] = useState(false);
  const [escalationAlerts, setEscalationAlerts] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState(SAMPLE_SCHEDULED_POSTS);
  const [pendingApprovals, setPendingApprovals] = useState(SAMPLE_PENDING_APPROVALS);

  const handleApprove = (id: string) => {
    setPendingApprovals(prev =>
      prev.filter(item => item.id !== id)
    );
  };

  const handleReject = (id: string) => {
    setPendingApprovals(prev =>
      prev.filter(item => item.id !== id)
    );
  };

  const handleCancelPost = (id: string) => {
    setScheduledPosts(prev =>
      prev.map(post =>
        post.id === id ? { ...post, status: 'cancelled' } : post
      )
    );
  };

  const activeScheduledPosts = scheduledPosts.filter(
    p => p.status === 'scheduled'
  ).length;

  const totalLeads = 24;
  const totalPosts = scheduledPosts.filter(p => p.status === 'posted').length;
  const totalReplies = 12;

  const ToggleSwitch = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          value ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facebook Automation</h1>
          <p className="text-gray-600 mt-2">
            Manage automated posts, replies, and lead responses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{totalLeads}</p>
                <p className="text-sm text-gray-600 mt-2">Leads Captured</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{totalPosts}</p>
                <p className="text-sm text-gray-600 mt-2">Posts Published</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {totalReplies}
                </p>
                <p className="text-sm text-gray-600 mt-2">Auto Replies Sent</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {activeScheduledPosts}
                </p>
                <p className="text-sm text-gray-600 mt-2">Scheduled Posts</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting posting</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automation Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Automation Settings</CardTitle>
            <CardDescription>
              Enable or disable automated posting and responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleSwitch
              label="Auto-Post"
              description="Automatically post scheduled content to Facebook"
              value={autoPost}
              onChange={setAutoPost}
            />

            <ToggleSwitch
              label="Auto-Reply"
              description="Send automatic responses to inquiries"
              value={autoReply}
              onChange={setAutoReply}
            />

            <ToggleSwitch
              label="CEO Approval Required"
              description="Require CEO approval before posting content"
              value={ceoApproval}
              onChange={setCeoApproval}
            />

            <ToggleSwitch
              label="Escalation Alerts"
              description="Receive notifications for complex inquiries"
              value={escalationAlerts}
              onChange={setEscalationAlerts}
            />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scheduled Posts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <CardDescription>
                  {activeScheduledPosts} posts scheduled for posting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scheduledPosts.map(post => (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <Badge
                        variant={
                          post.status === 'scheduled'
                            ? 'default'
                            : post.status === 'posted'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {post.status === 'scheduled'
                          ? '⏰ Scheduled'
                          : post.status === 'posted'
                          ? '✓ Posted'
                          : '✗ Cancelled'}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-3">
                      {post.content}
                    </p>

                    {post.scheduledTime && (
                      <p className="text-xs text-gray-500">
                        {post.scheduledTime.toLocaleString()}
                      </p>
                    )}

                    {post.status === 'scheduled' && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleCancelPost(post.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>
                  {pendingApprovals.length} items waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      ✓ No pending items. All caught up!
                    </p>
                  </div>
                ) : (
                  pendingApprovals.map(item => (
                    <div
                      key={item.id}
                      className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary">⏳ Pending Review</Badge>
                        <p className="text-xs text-gray-500">
                          {item.submittedAt.toLocaleTimeString()}
                        </p>
                      </div>

                      {item.leadInfo && (
                        <div className="bg-white p-3 rounded border border-gray-200">
                          <p className="font-medium text-sm text-gray-900">
                            {item.leadInfo.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.leadInfo.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Property: {item.leadInfo.property}
                          </p>
                        </div>
                      )}

                      <p className="text-sm text-gray-700">{item.content}</p>

                      <div className="flex gap-2 pt-2 border-t border-yellow-200">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(item.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleReject(item.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Metrics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Monitor your automation effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">2.3 min</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Lead Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">18%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Post Engagement Avg</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">4.7%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Uptime</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">99.9%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
