// ============================================================================
// API Client - For connecting to Clippy backend
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Helper for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Leads API
export const leadsApi = {
  getAll: (params?: { org_id?: string; status?: string; limit?: number }) =>
    apiCall(`/leads?${new URLSearchParams(params as any).toString()}`),
  
  getById: (id: string) => apiCall(`/leads/${id}`),
  
  create: (data: any) =>
    apiCall("/leads", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiCall(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiCall(`/leads/${id}`, { method: "DELETE" }),
  
  assign: (id: string, user_id: string) =>
    apiCall(`/leads/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),
  
  convert: (id: string, conversion_data?: any) =>
    apiCall(`/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({ conversion_data }),
    }),
};

// Listings API
export const listingsApi = {
  getAll: (params?: { org_id?: string; status?: string; limit?: number }) =>
    apiCall(`/listings?${new URLSearchParams(params as any).toString()}`),
  
  getById: (id: string) => apiCall(`/listings/${id}`),
  
  create: (data: any) =>
    apiCall("/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: any) =>
    apiCall(`/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    apiCall(`/listings/${id}`, { method: "DELETE" }),
  
  generateContent: (id: string, options?: { tone?: string; style?: string }) =>
    apiCall(`/listings/${id}/generate-content`, {
      method: "POST",
      body: JSON.stringify(options),
    }),
};

// AI API
export const aiApi = {
  draftReply: (conversation_id: string, options?: { tone?: string }) =>
    apiCall("/ai/draft-reply", {
      method: "POST",
      body: JSON.stringify({ conversation_id, ...options }),
    }),
  
  transcribe: (audio_base64: string, language?: string) =>
    apiCall("/ai/transcribe", {
      method: "POST",
      body: JSON.stringify({ audio_base64, language }),
    }),
  
  generateListing: (data: {
    address: string;
    suburb: string;
    bedrooms: number;
    bathrooms: number;
    features?: string[];
    tone?: string;
  }) =>
    apiCall("/ai/generate-listing", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  qualifyLead: (lead_id: string, conversation_history: string) =>
    apiCall("/ai/qualify-lead", {
      method: "POST",
      body: JSON.stringify({ lead_id, conversation_history }),
    }),
};

// Analytics API
export const analyticsApi = {
  getDashboard: (org_id: string) =>
    apiCall(`/analytics/dashboard?org_id=${org_id}`),
  
  getUsage: (org_id: string, params?: { start_date?: string; end_date?: string }) =>
    apiCall(`/analytics/usage?org_id=${org_id}&${new URLSearchParams(params as any).toString()}`),
  
  getLeadAnalytics: (org_id: string, period?: string) =>
    apiCall(`/analytics/leads?org_id=${org_id}&period=${period || "30_days"}`),
  
  logEvent: (data: {
    org_id: string;
    user_id?: string;
    event_type: string;
    tokens_used?: number;
    metadata?: any;
  }) =>
    apiCall("/analytics/log", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  getPlans: () => apiCall("/analytics/plans"),
};

// Health check
export const healthApi = {
  check: () => apiCall("/health"),
};
