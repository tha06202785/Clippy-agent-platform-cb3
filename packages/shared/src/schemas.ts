import { z } from "zod";

export const PlanId = z.enum(["free", "starter", "professional", "agency"]);
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

export const PLANS = {
  free: { name: "Free", price: 0, aiReplies: 50, listings: 5, leads: 100 },
  starter: { name: "Starter", price: 29, aiReplies: 500, listings: 25, leads: 500 },
  professional: { name: "Professional", price: 79, aiReplies: -1, listings: -1, leads: -1 },
  agency: { name: "Agency", price: 199, aiReplies: -1, listings: -1, leads: -1 },
} as const;
