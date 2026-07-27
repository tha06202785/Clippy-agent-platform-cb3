import { supabase } from "./supabase";

export interface Lead {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  source: string;
  status?: string;
  interest_level?: "high" | "medium" | "low";
  property_interest?: string;
  notes?: string;
  assigned_to_user_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  description?: string;
  due_at: string;
  lead_id?: string;
  listing_id?: string;
  assigned_to_user_id: string;
  status?: "pending" | "completed" | "cancelled";
  created_at?: string;
}

export interface Property {
  id: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  price: number;
  features?: string[];
  description?: string;
  listing_status?: "active" | "pending" | "sold";
  owner_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface AutomationLog {
  id: string;
  type: string;
  source: string;
  status: "success" | "error" | "pending";
  message?: string;
  user_id: string;
  created_at: string;
}

export interface IntegrationStatus {
  id: string;
  service_name: string;
  is_connected: boolean;
  user_id: string;
  settings?: Record<string, any>;
  connected_at?: string;
  last_sync?: string;
}

// ============== LEADS ==============

export async function getLeads(userId: string, filters?: { status?: string; source?: string }): Promise<Lead[]> {
  try {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("assigned_to_user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.source) {
      query = query.eq("source", filters.source);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching leads:", error);
    return [];
  }
}

export async function getRecentLeads(userId: string, hours: number = 24): Promise<Lead[]> {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - hours);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("assigned_to_user_id", userId)
      .gte("created_at", oneDayAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching recent leads:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching recent leads:", error);
    return [];
  }
}

export async function createLead(lead: Omit<Lead, "id" | "created_at">): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .insert([lead])
      .select()
      .single();

    if (error) {
      console.error("Error creating lead:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error creating lead:", error);
    return null;
  }
}

export async function updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead | null> {
  try {
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("Error updating lead:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error updating lead:", error);
    return null;
  }
}

// ============== TASKS ==============

export async function getTasks(userId: string, filters?: { status?: string; type?: string }): Promise<Task[]> {
  try {
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to_user_id", userId)
      .order("due_at", { ascending: true });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching tasks:", error);
    return [];
  }
}

export async function getTodaysTasks(userId: string): Promise<Task[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to_user_id", userId)
      .gte("due_at", today.toISOString())
      .lt("due_at", tomorrow.toISOString())
      .order("due_at", { ascending: true });

    if (error) {
      console.error("Error fetching today's tasks:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching today's tasks:", error);
    return [];
  }
}

export async function createTask(task: Omit<Task, "id" | "created_at">): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error creating task:", error);
    return null;
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error updating task:", error);
    return null;
  }
}

// ============== PROPERTIES ==============

export async function getProperties(userId: string, filters?: { status?: string }): Promise<Property[]> {
  try {
    let query = supabase
      .from("listings")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("listing_status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching properties:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching properties:", error);
    return [];
  }
}

export async function createProperty(property: Omit<Property, "id" | "created_at">): Promise<Property | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .insert([property])
      .select()
      .single();

    if (error) {
      console.error("Error creating property:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error creating property:", error);
    return null;
  }
}

// ============== AUTOMATION LOGS ==============

export async function getAutomationLogs(
  userId: string,
  filters?: { source?: string; status?: string; limit?: number }
): Promise<AutomationLog[]> {
  try {
    let query = supabase
      .from("automation_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (filters?.source) {
      query = query.eq("source", filters.source);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching automation logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching automation logs:", error);
    return [];
  }
}

export async function createAutomationLog(log: Omit<AutomationLog, "id" | "created_at">): Promise<AutomationLog | null> {
  try {
    const { data, error } = await supabase
      .from("automation_logs")
      .insert([log])
      .select()
      .single();

    if (error) {
      console.error("Error creating automation log:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error creating automation log:", error);
    return null;
  }
}

// ============== INTEGRATION STATUS ==============

export async function getIntegrationStatus(
  userId: string,
  serviceName?: string
): Promise<IntegrationStatus[]> {
  try {
    let query = supabase
      .from("integration_status")
      .select("*")
      .eq("user_id", userId);

    if (serviceName) {
      query = query.eq("service_name", serviceName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching integration status:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching integration status:", error);
    return [];
  }
}

export async function updateIntegrationStatus(
  userId: string,
  serviceName: string,
  updates: Partial<IntegrationStatus>
): Promise<IntegrationStatus | null> {
  try {
    const { data, error } = await supabase
      .from("integration_status")
      .update(updates)
      .eq("user_id", userId)
      .eq("service_name", serviceName)
      .select()
      .single();

    if (error) {
      console.error("Error updating integration status:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error updating integration status:", error);
    return null;
  }
}
