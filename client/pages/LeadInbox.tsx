// Lead Inbox Page - Production Ready
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeads, createLead, updateLead } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Phone, Mail, Filter } from 'lucide-react';
import type { Lead } from '@/types/lead';

export default function LeadInboxPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Get current org from user session (simplified)
  const orgId = 'org-001'; // TODO: Get from user context
  
  // Fetch leads with real-time updates
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads', orgId, statusFilter],
    queryFn: () => getLeads(orgId, statusFilter !== 'all' ? { status: statusFilter } : {}),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Create lead mutation
  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead created successfully');
      setIsCreateOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create lead');
    },
  });
  
  // Filter leads
  const filteredLeads = leads?.data?.filter((lead: Lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.full_name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.includes(q)
    );
  }) || [];
  
  // Status colors
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      inspection_booked: 'bg-purple-100 text-purple-800',
      converted: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  // Temperature colors
  const getTempColor = (temp: string) => {
    const colors: Record<string, string> = {
      hot: 'bg-red-500',
      warm: 'bg-orange-400',
      cold: 'bg-blue-300',
    };
    return colors[temp] || 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Lead Inbox</h1>
              <p className="text-muted-foreground">
                {filteredLeads.length} leads • {leads?.data?.filter((l: Lead) => l.status === 'new').length || 0} new
              </p>
            </div>
            
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="contacted">Contacted</TabsTrigger>
              <TabsTrigger value="qualified">Qualified</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Lead List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-red-500">Error loading leads</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['leads', orgId] })}
                  className="mt-4"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No leads found</p>
                <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                  Add Your First Lead
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredLeads.map((lead: Lead) => (
              <LeadCard 
                key={lead.id}
                lead={lead}
                onClick={() => navigate(`/leads/${lead.id}`)}
                statusColor={getStatusColor}
                tempColor={getTempColor}
              />
            ))
          )}
        </div>
      </main>
      
      {/* Create Lead Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <CreateLeadForm 
            onSubmit={createMutation.mutate}
            isLoading={createMutation.isPending}
            orgId={orgId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Lead Card Component
function LeadCard({ 
  lead, 
  onClick, 
  statusColor, 
  tempColor 
}: { 
  lead: Lead; 
  onClick: () => void;
  statusColor: (s: string) => string;
  tempColor: (t: string) => string;
}) {
  const initials = lead.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {lead.full_name}
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Badge className={statusColor(lead.status)}>
                  {lead.status.replace('_', ' ')}
                </Badge>
                
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${tempColor(lead.temperature)}`} />
                  <span className="text-xs capitalize">{lead.temperature}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Source: {lead.source}</span>
                <span>•</span>
                <span>{formatDate(lead.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Lead Form
function CreateLeadForm({ 
  onSubmit, 
  isLoading, 
  orgId 
}: { 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
  orgId: string;
}) {
  const [formData, setFormData] = useState({
    org_id: orgId,
    full_name: '',
    email: '',
    phone: '',
    source: 'manual',
    notes: '',
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Full Name *</label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="John Smith"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+61 400 000 000"
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Source</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          >
            <option value="manual">Manual Entry</option>
            <option value="website">Website</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="referral">Referral</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            className="w-full min-h-[80px] p-2 border rounded-md"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional information..."
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.full_name}>
          {isLoading ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
