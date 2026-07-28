import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Lead schemas
export const createLeadSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "proposal", "closed_won", "closed_lost"]).optional(),
  stage: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

// Listing schemas
export const createListingSchema = z.object({
  address: z.string().min(1, "Address is required"),
  price: z.string().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  parking: z.number().int().positive().optional(),
  property_type: z.string().optional(),
  status: z.enum(["active", "pending", "sold", "expired", "draft"]).optional(),
  description: z.string().optional(),
});

export const updateListingSchema = createListingSchema.partial();

// AI schemas
export const copilotChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1, "At least one message is required"),
});

export const draftReplySchema = z.object({
  leadName: z.string().min(1, "Lead name is required"),
  leadMessage: z.string().min(1, "Lead message is required"),
  context: z.string().optional(),
});

export const generateContentSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  type: z.string().optional(),
});

export const generateListingSchema = z.object({
  address: z.string().min(1, "Address is required"),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  price: z.string().optional(),
  features: z.string().optional(),
});

export const qualifyLeadSchema = z.object({
  leadId: z.string().optional(),
  leadData: z.record(z.any()).optional(),
});

// Subscription schemas
export const checkoutSchema = z.object({
  plan: z.enum(["starter", "professional", "agency"]),
}).strict();

// Compliance schema
export const complianceCheckSchema = z.object({
  agentId: z.string().optional(),
});

// Generic validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data: T | null;
  error: string;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, error: "" };
  }
  const firstError = result.error.errors[0];
  return {
    success: false,
    data: null,
    error: firstError?.message || "Validation failed",
  };
}
