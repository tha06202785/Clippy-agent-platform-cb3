import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const getDashboardStats: RequestHandler = async (req, res) => {
  try {
    const { count: leadsCount } = await supabase.from("leads").select("*", { count: "exact", head: true });
    const { count: listingsCount } = await supabase.from("listings").select("*", { count: "exact", head: true });

    res.json({
      success: true,
      stats: {
        totalLeads: leadsCount || 0,
        totalListings: listingsCount || 0,
        newLeadsThisWeek: 0,
        activeListings: listingsCount || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
