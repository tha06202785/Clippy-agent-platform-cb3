const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

// Lead API
export const getLeads = async (orgId: string, options: { status?: string; assigned_to?: string } = {}) => {
  let query = supabase
    .from('leads')
    .select('*, lead_events(count), conversations(last_message_at)')
    .eq('org_id', orgId);
  
  if (options.status) query = query.eq('status', options.status);
  if (options.assigned_to) query = query.eq('assigned_to_user_id', options.assigned_to);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
};

export const getLead = async (leadId) => {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      lead_events(*),
      conversations(*, messages(*)),
      linked_listing:listings(*)
    `)
    .eq('id', leadId)
    .single();
  
  return { data, error };
};

export const createLead = async (leadData) => {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();
  
  return { data, error };
};

export const updateLead = async (leadId, updates) => {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single();
  
  return { data, error };
};

// Lead events
export const addLeadEvent = async (eventData) => {
  const { data, error } = await supabase
    .from('lead_events')
    .insert([eventData])
    .select()
    .single();
  
  return { data, error };
};

// Tasks API
export const getTasks = async (orgId: string, options: { status?: string; assigned_to?: string } = {}) => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      leads(full_name),
      listings(address, suburb)
    `)
    .eq('org_id', orgId);
  
  if (options.status) query = query.eq('status', options.status);
  if (options.assigned_to) query = query.eq('assigned_to_user_id', options.assigned_to);
  
  const { data, error } = await query.order('due_at', { ascending: true });
  return { data, error };
};

export const completeTask = async (taskId) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();
  
  return { data, error };
};

// Listings API
export const getListings = async (orgId: string, options: { status?: string } = {}) => {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('org_id', orgId);
  
  if (options.status) query = query.eq('status', options.status);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
};

export const getListing = async (listingId) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*, content_packs(*), leads(count)')
    .eq('id', listingId)
    .single();
  
  return { data, error };
};

export const createListing = async (listingData) => {
  const { data, error } = await supabase
    .from('listings')
    .insert([{ ...listingData, status: 'draft' }])
    .select()
    .single();
  
  return { data, error };
};

// AI API
export const generateAIDraft = async (conversationId, tone = 'professional') => {
  const response = await fetch('/api/ai/draft-reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({ conversation_id: conversationId, tone })
  });
  
  return response.json();
};

export const generateContentPack = async (listingId: string, options: { pack_type?: string; tone?: string } = {}) => {
  const response = await fetch('/api/ai/content-pack', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({
      listing_id: listingId,
      pack_type: options.pack_type || 'social',
      tone: options.tone || 'professional'
    })
  });
  
  return response.json();
};

// Content Packs
export const getContentPacks = async (listingId) => {
  const { data, error } = await supabase
    .from('content_packs')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const approveContentPack = async (packId) => {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('content_packs')
    .update({
      status: 'approved',
      approved_by_user_id: user.user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', packId)
    .select()
    .single();
  
  return { data, error };
};

// Stats
export const getDashboardStats = async (orgId) => {
  // Get counts
  const { data: leads } = await supabase
    .from('leads')
    .select('status', { count: 'exact' })
    .eq('org_id', orgId);
  
  const { data: listings } = await supabase
    .from('listings')
    .select('status', { count: 'exact' })
    .eq('org_id', orgId);
  
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('status', 'pending');
  
  return {
    total_leads: leads?.length || 0,
    active_listings: listings?.length || 0,
    pending_tasks: tasks?.length || 0
  };
};
