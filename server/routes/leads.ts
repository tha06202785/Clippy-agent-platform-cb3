import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export const getLeads: RequestHandler = async (req, res) => {
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, leads: data });
};

export const createLead: RequestHandler = async (req, res) => {
  const { data, error } = await supabase.from("leads").insert([req.body]).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, lead: data[0] });
};

export const updateLead: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("leads").update(req.body).eq("id", id).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, lead: data[0] });
};

export const deleteLead: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
};
