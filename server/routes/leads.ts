// ============================================================================
// Leads API Routes
// ============================================================================

import { Router } from "express";
import { supabase } from "@/lib/supabase";

const router = Router();

// GET /api/leads - Get all leads for the current org
router.get("/", async (req, res) => {
  try {
    const { org_id, status, assigned_to, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from("leads")
      .select("*, lead_events(*), conversations(*)")
      .order("created_at", { ascending: false })
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (assigned_to) {
      query = query.eq("assigned_to_user_id", assigned_to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/:id - Get a specific lead
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("leads")
      .select("*, lead_events(*), conversations(*, messages(*)), tasks(*)")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads - Create a new lead
router.post("/", async (req, res) => {
  try {
    const {
      org_id,
      full_name,
      email,
      phone,
      source,
      source_url,
      status = "new",
      priority = "medium",
      notes,
      assigned_to_user_id,
      property_interest,
      budget_min,
      budget_max,
      timeframe,
    } = req.body;
    
    // Validate required fields
    if (!org_id || !full_name) {
      return res.status(400).json({
        success: false,
        error: "org_id and full_name are required"
      });
    }
    
    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        org_id,
        full_name,
        email,
        phone,
        source,
        source_url,
        status,
        priority,
        notes,
        assigned_to_user_id,
        property_interest,
        budget_min,
        budget_max,
        timeframe,
      })
      .select()
      .single();
    
    if (leadError) throw leadError;
    
    // Log the creation event
    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "created",
      event_data: { source, status },
    });
    
    // Log usage event
    await supabase.from("usage_events").insert({
      org_id,
      user_id: assigned_to_user_id,
      event_type: "lead_created",
      metadata: { lead_id: lead.id },
    });
    
    res.status(201).json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/leads/:id - Update a lead
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    
    const { data, error } = await supabase
      .from("leads")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    
    // Log the update event
    await supabase.from("lead_events").insert({
      lead_id: id,
      event_type: "updated",
      event_data: updates,
    });
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/:id - Delete a lead
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/:id/assign - Assign lead to agent
router.post("/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    const { data, error } = await supabase
      .from("leads")
      .update({
        assigned_to_user_id: user_id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log assignment event
    await supabase.from("lead_events").insert({
      lead_id: id,
      event_type: "assigned",
      event_data: { assigned_to: user_id },
    });
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/:id/convert - Convert lead to opportunity
router.post("/:id/convert", async (req, res) => {
  try {
    const { id } = req.params;
    const { conversion_data } = req.body;
    
    const { data, error } = await supabase
      .from("leads")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
        conversion_value: conversion_data?.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log conversion event
    await supabase.from("lead_events").insert({
      lead_id: id,
      event_type: "converted",
      event_data: conversion_data,
    });
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
