// ============================================================================
// Listings API Routes
// ============================================================================

import { Router } from "express";
import { supabase } from "@/lib/supabase";

const router = Router();

// GET /api/listings - Get all listings
router.get("/", async (req, res) => {
  try {
    const { org_id, status, agent_id, suburb, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from("listings")
      .select("*, agent:profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (org_id) {
      query = query.eq("org_id", org_id);
    }
    
    if (status) {
      query = query.eq("status", status);
    }
    
    if (agent_id) {
      query = query.eq("agent_user_id", agent_id);
    }
    
    if (suburb) {
      query = query.ilike("suburb", `%${suburb}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/listings/:id - Get a specific listing
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from("listings")
      .select("*, agent:profiles(full_name, email, phone), short_links(*)")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/listings - Create a new listing
router.post("/", async (req, res) => {
  try {
    const {
      org_id,
      agent_user_id,
      address,
      suburb,
      state,
      postcode,
      type = "sale",
      status = "draft",
      price_display,
      price_min,
      price_max,
      bedrooms,
      bathrooms,
      carspaces,
      land_size,
      building_size,
      features_json,
      description,
      headline,
      images,
    } = req.body;
    
    // Validate required fields
    if (!org_id || !address || !suburb || !state) {
      return res.status(400).json({
        success: false,
        error: "org_id, address, suburb, and state are required"
      });
    }
    
    const { data: listing, error } = await supabase
      .from("listings")
      .insert({
        org_id,
        agent_user_id,
        address,
        suburb,
        state,
        postcode,
        type,
        status,
        price_display,
        price_min,
        price_max,
        bedrooms,
        bathrooms,
        carspaces,
        land_size,
        building_size,
        features_json,
        description,
        headline,
        images,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log usage event
    await supabase.from("usage_events").insert({
      org_id,
      user_id: agent_user_id,
      event_type: "listing_created",
      metadata: { listing_id: listing.id },
    });
    
    res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/listings/:id - Update a listing
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    
    const { data, error } = await supabase
      .from("listings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/listings/:id - Delete a listing
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    res.json({ success: true, message: "Listing deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/listings/:id/generate-content - Generate AI content for listing
router.post("/:id/generate-content", async (req, res) => {
  try {
    const { id } = req.params;
    const { tone = "professional", style = "descriptive" } = req.body;
    
    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single();
    
    if (listingError || !listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    
    // TODO: Call OpenAI API to generate content
    // For now, return mock generated content
    const generatedContent = {
      headline: `Stunning ${listing.bedrooms} Bedroom ${listing.type === "sale" ? "Home" : "Property"} in ${listing.suburb}`,
      description: `Beautiful property located in the heart of ${listing.suburb}. Features ${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms, and ${listing.carspaces} car spaces. Perfect for families looking for their dream home.`,
      social_media: `🏠 Just Listed! ${listing.bedrooms}BR/${listing.bathrooms}BA in ${listing.suburb}. ${listing.price_display || "Contact for price"}. DM for inspections!`,
      whatsapp: `Hi! I wanted to share this amazing property with you: ${listing.address}, ${listing.suburb}. ${listing.bedrooms} bedrooms, ${listing.bathrooms} bathrooms. Interested? Let me know!`,
    };
    
    // Log usage event
    await supabase.from("usage_events").insert({
      org_id: listing.org_id,
      event_type: "ai_content_generated",
      metadata: { listing_id: id, tone, style },
    });
    
    res.json({ success: true, data: generatedContent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
