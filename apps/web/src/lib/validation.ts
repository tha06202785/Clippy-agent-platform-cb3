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
  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "closed_won",
      "closed_lost",
    ])
    .optional(),
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
  status: z
    .enum(["available", "active", "pending", "sold", "expired", "draft"])
    .optional(),
  stage: z
    .enum([
      "inquiry",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ])
    .optional(),
  description: z.string().optional(),
});

export const updateListingSchema = createListingSchema.partial();

// Inspection slot schemas
export const createInspectionSlotSchema = z
  .object({
    listing_id: z.string().uuid("Select a property"),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    capacity: z.number().int().min(1).max(100),
    inspection_type: z.enum(["open_home", "private"]),
    timezone: z.string().trim().min(1).max(80),
    location_notes: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((slot, ctx) => {
    const startsAt = Date.parse(slot.starts_at);
    const endsAt = Date.parse(slot.ends_at);

    if (endsAt <= startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "End time must be after the start time",
      });
      return;
    }

    if (endsAt - startsAt > 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "An inspection slot cannot be longer than 24 hours",
      });
    }
  });

export const updateInspectionSlotSchema = z
  .object({
    status: z.enum(["published", "cancelled"]),
  })
  .strict();

export function addMinutesToLocalDateTime(
  value: string,
  minutes: number,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + minutes);

  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// AI schemas
export const copilotChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .min(1, "At least one message is required"),
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
export const checkoutSchema = z
  .object({
    plan: z.enum(["starter", "professional", "agency"]),
  })
  .strict();

// Compliance schema
export const complianceCheckSchema = z.object({
  agentId: z.string().optional(),
});

// Generic validation helper
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): {
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
