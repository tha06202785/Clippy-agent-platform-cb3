import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  MessageCircle, 
  Users, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Facebook,
  Instagram,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalLeads: number;
  leadsToday: number;
  totalPosts: number;
  postsToday: number;
  totalReplies: number;
  repliesToday: number;
  pendingApproval: number;
  systemStatus: 'running' | 'paused' | 'error';
}

interface Lead {
  id: string;
  name: string;
  source: string;
  capturedAt: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  temperature: 'hot' | 'warm' | 'cold';
  message: string;
}

interface Activity {
  id: string;
  type: 'post' | 'reply' | 'lead' | 'approval';
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
}

interface ScheduledPost {
  id: string;
  content: string;
  scheduledFor: string;
  platform: 'facebook' | 'instagram';
  status: 'scheduled' | 'published' | 'failed';
}

export function FacebookAutomationDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 127,
    leadsToday: 8,
    totalPosts: 45,
    postsToday: 3,
    totalReplies: 234,
    repliesToday: 12,
    pendingApproval: 2,
    systemStatus: 'running'
  });

  const [autoPost, setAutoPost] = useState(true);
  const [autoReply, setAutoReply] = useState(true);
  const [ceoApproval, setCeoApproval] = useState(false);
  const [escalationAlerts, setEscalationAlerts] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 'lead_001',
      name: 'Sarah Johnson',
      source: 'Facebook Comment',
      capturedAt: '2024-03-22 15:30',
      status: 'new',
      temperature: 'hot',
      message: 'Interested in Clippy! How much does it cost?'
    },
    {
      id: 'lead_002',
      name: 'Michael Chen',
      source: 'Facebook DM',
      capturedAt: '2024-03-22 14:45',
      status: 'new',
      temperature: 'warm',
      message: 'Can I try the free trial?'
    },
    {
      id: 'lead_003',
      name: 'Jessica Williams',
      source: 'Instagram Comment',
      capturedAt: '2024-03-22 13:20',
      status: 'contacted',
      temperature: 'hot',
      message: 'This is exactly what I need!'
    }
  ]);

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: 'act_001',
      type: 'lead',
      description: 'New lead captured from Facebook: Sarah Johnson',
      timestamp: '15:30',
      status: 'success'
    },
    {
      id: 'act_002',
      type: 'reply',
      description: 'Auto-replied to comment on post #3',
      timestamp: '15:28',
      status: 'success'
    },
    {
      id: 'act_003',
      type: 'post',
      description: 'Published post: "Value First" template',
      timestamp: '14:00',
      status: 'success'
    },
    {
      id: 'act_004',
      type: 'approval',
      description: 'Post waiting for CEO approval',
      timestamp: '13:45',
      status: 'pending'
    }
  ]);

  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([
    {
      id: 'post_001',
      content: 'Value First post - How Clippy saves 10 hours/week',
      scheduledFor: '16:00',
      platform: 'facebook',
      status: 'scheduled'
    },
    {
      id: 'post_002',
      content: 'Free trial offer post',
      scheduledFor: '19:00',
      platform: 'facebook',
      status: 'scheduled'
    },
    {
      id: 'post_003',
      content: 'Testimonial - Sarah\'s success story',
      scheduledFor: '20:00',
      platform: 'instagram',
      status: 'scheduled'
    }
  ]);

  const toggleSystem = () => {
    const newStatus = stats.systemStatus === 'running' ? 'paused' : 'running';
    setStats({ ...stats, systemStatus: newStatus });
    toast.success(newStatus === 'running' ? 'Automation resumed' : 'Automation paused');
  };

  const approvePost = (postId: string) => {
    toast.success('Post approved and published!');
    setStats({ ...stats, pendingApproval: stats.pendingApproval - 1 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Running</Badge>;
      case 'paused':
        return <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" />Paused</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTemperatureBadge = (temp: string) => {
    switch (temp) {
      case 'hot':
        return <Badge className="bg-red-500">Hot 🔥</Badge>;
      case 'warm':
        return <Badge className="bg-orange-500">Warm</Badge>;
      case 'cold':
        return <Badge className="bg-blue-500">Cold</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Automation Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor Facebook/Instagram automation in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge(stats.systemStatus)}
          <Button 
            onClick={toggleSystem}
            variant={stats.systemStatus === 'running' ? 'destructive' : 'default'}
          >
            {stats.systemStatus === 'running' ? (
              <><Pause className="h-4 w-4 mr-2" /> Pause</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Resume</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Captured</p>
                <p className="text-3xl font-bold">{stats.totalLeads}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.leadsToday} today
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posts Published</p>
                <p className="text-3xl font-bold">{stats.totalPosts}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.postsToday} today
                </p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Replies</p>
                <p className="text-3xl font-bold">{stats.totalReplies}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{stats.repliesToday} today
                </p>
              </div>
              <MessageCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-bold">{stats.pendingApproval}</p>
                <p className="text-xs text-orange-500 flex items-center mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Needs action
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure how the automation behaves</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Auto-Post</p>
                  <p className="text-sm text-muted-foreground">Publish posts automatically</p>
                </div>
              </div>
              <Switch checked={autoPost} onCheckedChange={setAutoPost} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Auto-Reply</p>
                  <p className="text-sm text-muted-foreground">Reply to comments/DMs</p>
                </div>
              </div>
              <Switch checked={autoReply} onCheckedChange={setAutoReply} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">CEO Approval</p>
                  <p className="text-sm text-muted-foreground">Approve posts before publishing</p>
                </div>
              </div>
              <Switch checked={ceoApproval} onCheckedChange={setCeoApproval} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Escalation Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify on complaints/issues</p>
                </div>
              </div>
              <Switch checked={escalationAlerts} onCheckedChange={setEscalationAlerts} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Posts ({scheduledPosts.length})</TabsTrigger>
          <TabsTrigger value="approval">Pending Approval ({stats.pendingApproval})</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Leads
              </CardTitle>
              <CardDescription>Leads captured from Facebook/Instagram</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <div key={lead.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{lead.name}</p>
                          {getTemperatureBadge(lead.temperature)}
                          <Badge variant="outline" className="text-xs">
                            {lead.source.includes('Facebook') ? (
                              <Facebook className="h-3 w-3 mr-1" />
                            ) : (
                              <Instagram className="h-3 w-3 mr-1" />
                            )}
                            {lead.source}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">"{lead.message}"</p>
                        <p className="text-xs text-muted-foreground mt-1">Captured: {lead.capturedAt}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Real-time automation log</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.status === 'success' ? 'bg-green-500' : 
                        activity.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                      <Badge variant={activity.status === 'success' ? 'default' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Posts Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Posts
              </CardTitle>
              <CardDescription>Upcoming automated posts</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {post.platform === 'facebook' ? (
                              <Facebook className="h-3 w-3 mr-1" />
                            ) : (
                              <Instagram className="h-3 w-3 mr-1" />
                            )}
                            {post.platform}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Scheduled for: {post.scheduledFor}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="destructive">Cancel</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Approval Tab */}
        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending CEO Approval
              </CardTitle>
              <CardDescription>Posts waiting for your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">Urgency Post - Limited Spots</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    "⏰ Only 5 spots left at founding member pricing! Clippy AI: $49/month (normally $99)..."
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => approvePost('post_004')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve & Publish
                    </Button>
                    <Button variant="outline">Edit</Button>
                    <Button variant="destructive">Reject</Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">Tips Post - Writing Descriptions</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    "💡 3 Tips for Writing Killer Listing Descriptions: 1️⃣ Lead with lifestyle..."
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => approvePost('post_005')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve & Publish
                    </Button>
                    <Button variant="outline">Edit</Button>
                    <Button variant="destructive">Reject</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Create Manual Post
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Full Report
            </Button>
            <Button variant="outline" className="ml-auto">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp Alerts: ON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
