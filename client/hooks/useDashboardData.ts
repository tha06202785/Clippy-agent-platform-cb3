// ============================================================================
// Dashboard Data Hook - Fetches real data from API
// ============================================================================

import { useState, useEffect } from "react";
import { analyticsApi, leadsApi, listingsApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
  };
  ai_usage: {
    total_credits: number;
    used: number;
    remaining: number;
  };
  messages: {
    total: number;
    ai_sent: number;
    human_sent: number;
    response_rate: number;
  };
  listings: {
    active: number;
    sold_this_month: number;
    avg_days_on_market: number;
  };
}

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  recentLeads: any[];
  recentListings: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get user's org_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      const org_id = profile?.org_id;
      if (!org_id) {
        throw new Error("No organization found");
      }

      // Fetch dashboard stats from API
      const statsRes = await analyticsApi.getDashboard(org_id);
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // Fetch recent leads
      const leadsRes = await leadsApi.getAll({ org_id, limit: 5 });
      if (leadsRes.success) {
        setRecentLeads(leadsRes.data);
      }

      // Fetch recent listings
      const listingsRes = await listingsApi.getAll({ org_id, limit: 5 });
      if (listingsRes.success) {
        setRecentListings(listingsRes.data);
      }

    } catch (err: any) {
      console.error("Dashboard data error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    stats,
    recentLeads,
    recentListings,
    loading,
    error,
    refetch: fetchData,
  };
}
