// ============================================================================
// Dashboard Data Loader - Uses Real API Instead of Sample Data
// ============================================================================

import { useEffect, useState } from "react";
import { leadsApi, listingsApi, analyticsApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function useRealDashboardData() {
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user's org
        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        const org_id = profile?.org_id;
        if (!org_id) {
          setLoading(false);
          return;
        }

        // Fetch from API
        const [leadsRes, listingsRes, statsRes] = await Promise.all([
          leadsApi.getAll({ org_id, limit: 10 }),
          listingsApi.getAll({ org_id, limit: 10 }),
          analyticsApi.getDashboard(org_id),
        ]);

        if (leadsRes.success) setLeads(leadsRes.data);
        if (listingsRes.success) setListings(listingsRes.data);
        if (statsRes.success) setStats(statsRes.data);

      } catch (err: any) {
        console.error("Dashboard data error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { tasks, leads, listings, stats, loading, error };
}
