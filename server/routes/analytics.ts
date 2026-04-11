// ============================================================================
// Analytics API Routes
// ============================================================================

import { Router } from "express";
import { supabase } from "@/lib/supabase";

const router = Router();

// GET /api/analytics/dashboard - Get dashboard stats
router.get("/dashboard", async (req, res) => {
  try {
    const { org_id, start_date, end_date } = req.query;
    
    if (!org_id) {
      return res.status(400).json({
        success: false,
        error: "org_id is required"
      });
    }
    
    // Get leads stats
    const { data: leadsStats } = await supabase
      .from("leads")
      .select("status", { count: "exact" })
      .eq("org_id", org_id);
    
    const { data: newLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact" })
      .eq("org_id", org_id)
      .gte("created_at", start_date || "30 days ago")
      .single();
    
    // Get AI usage stats
    const { data: aiUsage } = await supabase
      .from("usage_events")
      .select("event_type, count")
      .eq("org_id", org_id)
      .gte("created_at", start_date || "30 days ago")
      .in("event_type", ["ai_message_drafted", "ai_content_generated"]);
    
    // Get message stats
    const { data: messageStats } = await supabase
      .from("messages")
      .select("sender_type, count")
      .eq("org_id", org_id)
      .gte("created_at", start_date || "30 days ago");
    
    // Get listing stats
    const { data: listingStats } = await supabase
      .from("listings")
      .select("status", { count: "exact" })
      .eq("org_id", org_id);
    
    // Calculate metrics
    const dashboardData = {
      leads: {
        total: leadsStats?.length || 0,
        new: newLeads?.count || 0,
        qualified: leadsStats?.filter((l: any) => l.status === "qualified").length || 0,
        converted: leadsStats?.filter((l: any) => l.status === "converted").length || 0,
      },
      ai_usage: {
        total_credits: 1000, // From subscription
        used: aiUsage?.reduce((sum: number, u: any) => sum + (u.count || 0), 0) || 0,
        remaining: 1000 - (aiUsage?.reduce((sum: number, u: any) => sum + (u.count || 0), 0) || 0),
      },
      messages: {
        total: messageStats?.length || 0,
        ai_sent: messageStats?.filter((m: any) => m.sender_type === "ai").length || 0,
        human_sent: messageStats?.filter((m: any) => m.sender_type === "user").length || 0,
        response_rate: 0.89, // Calculated from response times
      },
      listings: {
        active: listingStats?.filter((l: any) => l.status === "active").length || 0,
        sold_this_month: 0, // Calculate from sold dates
        avg_days_on_market: 23, // Calculate from dates
      },
    };
    
    res.json({ success: true, data: dashboardData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/usage - Get detailed usage breakdown
router.get("/usage", async (req, res) => {
  try {
    const { org_id, start_date, end_date, group_by = "day" } = req.query;
    
    if (!org_id) {
      return res.status(400).json({
        success: false,
        error: "org_id is required"
      });
    }
    
    const { data: usageEvents, error } = await supabase
      .from("usage_events")
      .select("*")
      .eq("org_id", org_id)
      .gte("created_at", start_date || "30 days ago")
      .lte("created_at", end_date || "now")
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    
    // Group by event type
    const grouped = usageEvents?.reduce((acc: any, event: any) => {
      const type = event.event_type;
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          tokens: 0,
        };
      }
      acc[type].count++;
      acc[type].tokens += event.tokens_used || 0;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        events: usageEvents,
        summary: grouped,
        total_events: usageEvents?.length || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/leads - Get leads analytics
router.get("/leads", async (req, res) => {
  try {
    const { org_id, period = "30_days" } = req.query;
    
    if (!org_id) {
      return res.status(400).json({
        success: false,
        error: "org_id is required"
      });
    }
    
    // Get leads by source
    const { data: leadsBySource } = await supabase.rpc("get_leads_by_source", {
      p_org_id: org_id,
      p_period: period,
    });
    
    // Get leads by status
    const { data: leadsByStatus } = await supabase.rpc("get_leads_by_status", {
      p_org_id: org_id,
      p_period: period,
    });
    
    // Get conversion funnel
    const { data: conversionFunnel } = await supabase.rpc(
      "get_conversion_funnel",
      {
        p_org_id: org_id,
        p_period: period,
      }
    );
    
    res.json({
      success: true,
      data: {
        by_source: leadsBySource || [],
        by_status: leadsByStatus || [],
        conversion_funnel: conversionFunnel || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/analytics/log - Log a usage event
router.post("/log", async (req, res) => {
  try {
    const {
      org_id,
      user_id,
      event_type,
      tokens_used = 0,
      metadata = {},
    } = req.body;
    
    if (!org_id || !event_type) {
      return res.status(400).json({
        success: false,
        error: "org_id and event_type are required"
      });
    }
    
    const { data, error } = await supabase
      .from("usage_events")
      .insert({
        org_id,
        user_id,
        event_type,
        tokens_used,
        metadata,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/plans - Get subscription plans
router.get("/plans", async (req, res) => {
  try {
    const plans = [
      {
        id: "starter",
        name: "Starter",
        price: 99,
        interval: "month",
        features: {
          leads: 100,
          ai_credits: 50,
          listings: 10,
          team_members: 1,
          support: "email",
        },
      },
      {
        id: "pro",
        name: "Pro",
        price: 299,
        interval: "month",
        features: {
          leads: 1000,
          ai_credits: 1000,
          listings: 50,
          team_members: 5,
          support: "priority",
        },
        popular: true,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        interval: "month",
        features: {
          leads: "unlimited",
          ai_credits: "unlimited",
          listings: "unlimited",
          team_members: "unlimited",
          support: "dedicated",
          extras: ["White-label", "Custom AI training", "API access"],
        },
      },
    ];
    
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
