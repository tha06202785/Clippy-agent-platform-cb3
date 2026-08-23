export const FOUNDING_PLAN_ID = "starter" as const;

export function getRequestedFoundingPlan(search: string): "starter" | null {
  const plan = new URLSearchParams(search).get("plan");
  return plan === FOUNDING_PLAN_ID ? FOUNDING_PLAN_ID : null;
}

export function getSignupCompletionPath(search: string): string {
  const plan = getRequestedFoundingPlan(search);
  return plan ? `/onboarding?plan=${plan}` : "/onboarding";
}

export function getOnboardingCompletionPath(search: string): string {
  return getRequestedFoundingPlan(search)
    ? "/admin/billing?subscribe=starter"
    : "/dashboard";
}
