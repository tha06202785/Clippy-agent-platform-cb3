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

// Automation mode for conversations
export const AutomationMode = z.enum(["off", "autonomous"]);
export type AutomationMode = z.infer<typeof AutomationMode>;
export const AUTOMATION_MODE = "autonomous" as const;

// Source of truth for all plan definitions — used by UI, API, and Stripe.
// Sync STRIPE_PRICE_IDS env var with Stripe product names.
// Stripe checkout route reads from process.env.STRIPE_*_PRICE_ID directly.
export const PLANS = {
  free:         { name: "Free",         price: 0,   priceLabel: "$0",     aiReplies: 30,   listings: 3,   leads: 100,  agents: 1   },
  solo:         { name: "Solo",         price: 79,  priceLabel: "$79/mo",  aiReplies: 500,  listings: 20,  leads: 500,  agents: 1   },
  professional: { name: "Professional", price: 149, priceLabel: "$149/mo", aiReplies: 2000, listings: 100, leads: 2000, agents: 1   },
  team:         { name: "Team",         price: 149, priceLabel: "$149/mo", aiReplies: -1,   listings: -1,  leads: -1,   agents: 3   },
  enterprise:   { name: "Enterprise",   price: 999, priceLabel: "$999/mo", aiReplies: -1,   listings: -1,  leads: -1,   agents: -1  },
} as const;

export type PlanKey = keyof typeof PLANS;
