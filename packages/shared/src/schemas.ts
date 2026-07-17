import { z } from "zod";

export const PlanId = z.enum(["free", "solo", "professional", "team", "enterprise", "past_due"]);
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
  free:        { name: "Free",         price: 0,    aiReplies: 30,   listings: 3,    leads: 100    },
  solo:        { name: "Solo",         price: 79,   aiReplies: 500,  listings: 20,   leads: 500    },
  professional:{ name: "Professional", price: 149,  aiReplies: 2000, listings: 100,  leads: 2000   },
  team:        { name: "Team",         price: 149,  aiReplies: -1,   listings: -1,   leads: -1     },
  enterprise:  { name: "Enterprise",   price: 999,  aiReplies: -1,   listings: -1,   leads: -1     },
} as const;
