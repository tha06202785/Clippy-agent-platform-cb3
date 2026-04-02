import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeads, createLead, updateLead } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Phone, Mail, MessageSquare, Filter, Search } from 'lucide-react';

// Types
interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'inspection_booked' | 'converted' | 'lost';
  temperature: 'hot' | 'warm' | 'cold';
  source: string;
  created_at: string;
  last_contact_at?: string;
  assigned_to_user_id?: string;
}

// Helper functions (defined outside component for reuse)
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-green-100 text-green-800',
    inspection_booked: 'bg-purple-100 text-purple-800',
    converted: 'bg-emerald-100 text-emerald-800',
    lost: 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getTemperatureColor = (temp: string) => {
  const colors: Record<string, string> = {
    hot: 'bg-red-500',
    warm: 'bg-orange-400',
    cold: 'bg-blue-300'
  };
  return colors[temp] || 'bg-gray-300';
};

export function LeadList({ orgId }: { orgId: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch leads
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads', orgId, statusFilter],
    queryFn: () => getLeads(orgId, statusFilter !== 'all' ? { status: statusFilter } : {}),
  });
  
  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (leadData: Partial<Lead>) => createLead({
      org_id: orgId,
      ...leadData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create lead: ' + error.message);
    }
  });
  
  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Lead> }) => 
      updateLead(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', orgId] });
      toast.success('Lead updated');
    }
  });
  
  // Filter leads by search
  const filteredLeads = leads?.data?.filter((lead: Lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.full_name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="inspection_booked">Inspection</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <CreateLeadForm 
              onSubmit={(data) => createLeadMutation.mutate(data)}
              isLoading={createLeadMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{leads?.data?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">
              {leads?.data?.filter((l: Lead) => l.temperature === 'hot').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Hot Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">
              {leads?.data?.filter((l: Lead) => l.status === 'new').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">New Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {leads?.data?.filter((l: Lead) => l.status === 'converted').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Converted</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Lead List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">
          Error loading leads. Please try again.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeads?.map((lead: Lead) => (
            <LeadCard 
              key={lead.id} 
              lead={lead}
              onUpdate={(updates) => updateLeadMutation.mutate({ id: lead.id, updates })}
            />
          ))}
          
          {filteredLeads?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No leads match your search' : 'No leads yet. Add your first lead!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual Lead Card
function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (updates: Partial<Lead>) => void }) {
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(lead.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold truncate">{lead.full_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
              
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className={getStatusColor(lead.status)}>
                  {lead.status.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getTemperatureColor(lead.temperature)}`} />
                  <span className="text-xs text-muted-foreground capitalize">{lead.temperature}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Source: {lead.source}</span>
                <span>•</span>
                <span>{formatDate(lead.created_at)}</span>
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onUpdate({ status: 'contacted' })}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Lead Form
function CreateLeadForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    source: 'manual',
    notes: ''
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add New Lead</DialogTitle>
      </DialogHeader>
      
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
          <Select 
            value={formData.source} 
            onValueChange={(value) => setFormData({ ...formData, source: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Notes</label>
          <textarea
            className="w-full min-h-[80px] p-2 border rounded-md"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional information..."
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
