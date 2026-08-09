import { z } from "zod";

export const PlanId = z.enum(["free", "starter", "professional", "agency", "past_due"]);
export type PlanId = z.infer<typeof PlanId>;

export const AutopilotLevel = z.enum(["off", "supervised", "full"]);
export type AutopilotLevel = z.infer<typeof AutopilotLevel>;

export const LeadStatus = z.enum(["new", "contacted", "qualified", "proposal", "closed_won", "closed_lost"]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const ListingType = z.enum(["residential", "commercial", "business"]);
export type ListingType = z.infer<typeof ListingType>;

export const BriefingStage = z.enum([
  "qualification", "searching", "inspecting", "offer", "contract", "exchanged", "lost"
]);
export type BriefingStage = z.infer<typeof BriefingStage>;

// Automation mode for conversations
export const AutomationMode = z.enum(["off", "autonomous"]);
export type AutomationMode = z.infer<typeof AutomationMode>;
export const AUTOMATION_MODE = "autonomous" as const;
