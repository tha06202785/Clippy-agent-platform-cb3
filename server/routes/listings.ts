import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const getListings: RequestHandler = async (req, res) => {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, listings: data });
};

export const createListing: RequestHandler = async (req, res) => {
  const { data, error } = await supabase.from("listings").insert([req.body]).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, listing: data[0] });
};

export const updateListing: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("listings").update(req.body).eq("id", id).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, listing: data[0] });
};

export const deleteListing: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
};
