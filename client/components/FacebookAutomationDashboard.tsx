import React, { useState } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Check, X, Activity, ArrowLeft } from 'lucide-react';
import { getTasks, updateTask, Task } from '@/lib/dataService';
import { supabase } from '@/lib/supabase';

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

interface ScheduledPost {
  id: string;
  content: string;
  scheduledTime: Date;
  status: 'scheduled' | 'posted' | 'cancelled';
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

export default function FacebookAutomationDashboard() {
  const navigate = useNavigate();
  const [autoPost, setAutoPost] = useState(true);
  const [autoReply, setAutoReply] = useState(true);
  const [ceoApproval, setCeoApproval] = useState(false);
  const [escalationAlerts, setEscalationAlerts] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(SAMPLE_SCHEDULED_POSTS);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(SAMPLE_PENDING_APPROVALS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize user and load real data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          setUserId(session.user.id);

          // Load scheduled posts and pending approvals from real database
          const tasks = await getTasks(session.user.id, { type: 'post_facebook' });

          if (tasks && tasks.length > 0) {
            const posts: ScheduledPost[] = tasks
              .filter(t => new Date(t.due_at) > new Date())
              .map(t => ({
                id: t.id,
                content: t.description || t.title,
                scheduledTime: new Date(t.due_at),
                status: t.status === 'completed' ? 'posted' : 'scheduled',
              }));

            if (posts.length > 0) {
              setScheduledPosts(posts);
            }
          }
        }
      } catch (error) {
        console.error('Error loading automation data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleApprove = async (id: string) => {
    if (!userId) return;

    try {
      await updateTask(id, { status: 'completed' });
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (!userId) return;

    try {
      await updateTask(id, { status: 'cancelled' });
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error rejecting task:', error);
    }
  };

  const handleCancelPost = async (id: string) => {
    if (!userId) return;

    try {
      await updateTask(id, { status: 'cancelled' });
      setScheduledPosts(prev =>
        prev.map(post =>
          post.id === id ? { ...post, status: 'cancelled' } : post
        )
      );
    } catch (error) {
      console.error('Error cancelling post:', error);
    }
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
    <div className="flex items-center justify-between p-4 rounded-lg border-2 border-cyan-400/50 bg-gradient-to-br from-slate-800/40 to-blue-900/30 hover:border-cyan-300 transition-all">
      <div className="flex-1">
        <p className="font-semibold text-cyan-300">{label}</p>
        <p className="text-sm text-cyan-200/70">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          value ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-700'
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
            Facebook Automation
          </h1>
          <p className="text-cyan-200/80 text-lg drop-shadow">
            Manage automated posts, replies, and lead responses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {[
            { label: 'Leads Captured', value: totalLeads, icon: '📊', color: 'from-blue-500 to-blue-600' },
            { label: 'Posts Published', value: totalPosts, icon: '📝', color: 'from-green-500 to-green-600' },
            { label: 'Auto Replies Sent', value: totalReplies, icon: '💬', color: 'from-purple-500 to-purple-600' },
            { label: 'Scheduled Posts', value: activeScheduledPosts, icon: '⏰', color: 'from-orange-500 to-orange-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 hover:-translate-y-2 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)',
                animationDelay: `${idx * 100}ms`,
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
              <div className="relative p-6 z-10 text-center">
                <p className="text-4xl mb-2">{stat.icon}</p>
                <p className="text-4xl md:text-5xl font-black text-cyan-300 tabular-nums drop-shadow-lg">
                  {stat.value}
                </p>
                <p className="text-sm text-cyan-200/80 font-bold mt-3 uppercase tracking-widest drop-shadow">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Automation Controls */}
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 mb-8 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
          <div className="relative p-8 z-10">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 drop-shadow-lg mb-8">
              <div className="p-2 bg-gradient-to-br from-cyan-500/40 to-blue-600/30 rounded-lg border border-cyan-400/60 shadow-lg shadow-cyan-500/30">
                <Activity className="w-6 h-6 text-cyan-300" />
              </div>
              Automation Settings
            </h2>
            <div className="space-y-3">
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
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scheduled Posts */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-left-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-8 z-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-lg mb-6">
                <span>📅 Scheduled Posts</span>
              </h3>
              <p className="text-sm text-cyan-200/80 font-semibold mb-6 uppercase tracking-widest">
                {activeScheduledPosts} posts scheduled
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {scheduledPosts.map(post => (
                  <div
                    key={post.id}
                    className="border-2 border-cyan-400/30 rounded-lg p-4 bg-slate-800/30 hover:bg-slate-800/60 hover:border-cyan-400/60 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge
                        variant={
                          post.status === 'scheduled'
                            ? 'default'
                            : post.status === 'posted'
                            ? 'secondary'
                            : 'destructive'
                        }
                        className={
                          post.status === 'scheduled'
                            ? 'bg-cyan-600/80 text-cyan-100'
                            : post.status === 'posted'
                            ? 'bg-green-600/80 text-green-100'
                            : 'bg-red-600/80 text-red-100'
                        }
                      >
                        {post.status === 'scheduled'
                          ? '⏰ Scheduled'
                          : post.status === 'posted'
                          ? '✓ Posted'
                          : '✗ Cancelled'}
                      </Badge>
                    </div>

                    <p className="text-sm text-cyan-200 line-clamp-3 font-medium mb-2">
                      {post.content}
                    </p>

                    {post.scheduledTime && (
                      <p className="text-xs text-cyan-200/60 mb-3">
                        {post.scheduledTime.toLocaleString()}
                      </p>
                    )}

                    {post.status === 'scheduled' && (
                      <div className="flex gap-2 pt-2 border-t border-cyan-400/20">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/20"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 bg-red-600/80 hover:bg-red-700"
                          onClick={() => handleCancelPost(post.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 animate-in fade-in slide-in-from-right-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
            <div className="relative p-8 z-10">
              <h3 className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-lg mb-6">
                <span>⏳ Pending Approvals</span>
              </h3>
              <p className="text-sm text-cyan-200/80 font-semibold mb-6 uppercase tracking-widest">
                {pendingApprovals.length} items waiting for review
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-cyan-200/60">
                    <p className="font-semibold">✓ No pending items. All caught up!</p>
                  </div>
                ) : (
                  pendingApprovals.map(item => (
                    <div
                      key={item.id}
                      className="border-2 border-amber-400/50 bg-amber-400/10 rounded-lg p-4 hover:border-amber-400/80 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-amber-600/80 text-amber-100">⏳ Pending</Badge>
                        <p className="text-xs text-cyan-200/60">
                          {item.submittedAt.toLocaleTimeString()}
                        </p>
                      </div>

                      {item.leadInfo && (
                        <div className="bg-slate-800/60 p-3 rounded border border-cyan-400/20 mb-3">
                          <p className="font-semibold text-cyan-300 text-sm">
                            {item.leadInfo.name}
                          </p>
                          <p className="text-xs text-cyan-200/70">
                            {item.leadInfo.email}
                          </p>
                          <p className="text-xs text-cyan-200/60 mt-1">
                            Property: {item.leadInfo.property}
                          </p>
                        </div>
                      )}

                      <p className="text-sm text-cyan-200 font-medium mb-3">
                        {item.content}
                      </p>

                      <div className="flex gap-2 pt-2 border-t border-amber-400/20">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600/80 hover:bg-green-700 text-white font-semibold"
                          onClick={() => handleApprove(item.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 bg-red-600/80 hover:bg-red-700"
                          onClick={() => handleReject(item.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="group relative overflow-hidden rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 border-cyan-400/50 group-hover:border-cyan-300 hover:shadow-3xl hover:shadow-cyan-500/50 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 58, 138, 0.4) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/30 to-blue-600/20 rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl" />
          <div className="relative p-8 z-10">
            <h3 className="text-2xl font-black text-white drop-shadow-lg mb-6">
              Performance Metrics
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Avg Response Time', value: '2.3 min' },
                { label: 'Lead Conversion Rate', value: '18%' },
                { label: 'Post Engagement Avg', value: '4.7%' },
                { label: 'Uptime', value: '99.9%' },
              ].map((metric, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-sm text-cyan-200/80 font-bold mb-2 uppercase tracking-widest">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-black text-cyan-300 drop-shadow">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
