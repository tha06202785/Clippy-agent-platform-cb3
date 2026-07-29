import { z } from "zod";

export const platformActionSchema = z
  .object({
    action: z.enum([
      "suspend_account",
      "resume_account",
      "retry_communication",
      "reset_integration",
    ]),
    orgId: z.string().uuid(),
    targetId: z.string().uuid().optional(),
    reason: z.string().trim().min(8).max(500),
    confirmation: z.string().trim(),
  })
  .superRefine((value, context) => {
    const requiresTarget = ["retry_communication", "reset_integration"].includes(
      value.action,
    );
    if (requiresTarget && !value.targetId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetId"],
        message: "This action requires a target",
      });
    }
    if (value.confirmation !== expectedPlatformConfirmation(value.action)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmation"],
        message: "Confirmation text does not match the requested action",
      });
    }
  });

export type PlatformActionInput = z.infer<typeof platformActionSchema>;

export function expectedPlatformConfirmation(
  action: PlatformActionInput["action"],
): string {
  return {
    suspend_account: "SUSPEND",
    resume_account: "RESUME",
    retry_communication: "RETRY",
    reset_integration: "RESET",
  }[action];
}

export function isTrustedPlatformActionOrigin(
  origin: string | null,
  requestUrl: string,
): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}
