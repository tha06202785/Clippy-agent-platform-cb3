// types/lead.ts - Lead type definitions

export interface Lead {
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
  org_id?: string;
  notes?: string;
  budget?: string;
  timeline?: string;
  property_interest?: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  type: string;
  description?: string;
  created_at: string;
  created_by?: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  org_id: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'phone' | 'facebook' | 'web';
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'lead' | 'ai_draft';
  status: 'draft' | 'sent' | 'read';
  created_at: string;
}
