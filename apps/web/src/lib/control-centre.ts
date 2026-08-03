import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeatureKey =
  | "copilot_chat"
  | "knowledge_search"
  | "knowledge_upload"
  | "facebook_messenger"
  | "instagram_dm"
  | "whatsapp"
  | "email_automation"
  | "inspection_booking"
  | "advanced_analytics"
  | "team_management";

export type EntitlementDecision = {
  allowed: boolean;
  reason?: "not_subscribed" | "feature_disabled" | "limit_reached";
  planKey: string;
  monthlyLimit: number | null;
  used: number;
  remaining: number | null;
  usagePercent: number | null;
};

const DEFAULT_PLAN = "starter";

export async function checkEntitlement(
  supabase: SupabaseClient,
  orgId: string,
  featureKey: FeatureKey,
): Promise<EntitlementDecision> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const { data: subscription } = await supabase
    .from("org_subscriptions")
    .select("status, plans!inner(key), plan_id")
    .eq("org_id", orgId)
    .maybeSingle();

  const planKey = (subscription as any)?.plans?.key || DEFAULT_PLAN;
  const subscriptionStatus = (subscription as any)?.status;
  const active = !subscriptionStatus || ["trialing", "active", "past_due"].includes(subscriptionStatus);

  if (!active) {
    return {
      allowed: false,
      reason: "not_subscribed",
      planKey,
      monthlyLimit: null,
      used: 0,
      remaining: null,
      usagePercent: null,
    };
  }

  const { data: plan } = await supabase.from("plans").select("id").eq("key", planKey).maybeSingle();

  const [{ data: planFeature }, { data: override }, { count: used }] = await Promise.all([
    plan?.id
      ? supabase
          .from("plan_features")
          .select("enabled, monthly_limit")
          .eq("plan_id", plan.id)
          .eq("feature_key", featureKey)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabase
      .from("org_entitlement_overrides")
      .select("enabled, monthly_limit, expires_at")
      .eq("org_id", orgId)
      .eq("feature_key", featureKey)
      .maybeSingle(),
    supabase
      .from("ai_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("feature_key", featureKey)
      .gte("created_at", monthStart),
  ]);

  const overrideActive = override && (!override.expires_at || new Date(override.expires_at) > now);
  const enabled = overrideActive && override.enabled !== null ? override.enabled : planFeature?.enabled === true;
  const monthlyLimit =
    overrideActive && override.monthly_limit !== null
      ? override.monthly_limit
      : planFeature?.monthly_limit ?? null;
  const usage = used || 0;

  if (!enabled) {
    return {
      allowed: false,
      reason: "feature_disabled",
      planKey,
      monthlyLimit,
      used: usage,
      remaining: monthlyLimit === null ? null : Math.max(monthlyLimit - usage, 0),
      usagePercent: monthlyLimit ? Math.min(Math.round((usage / monthlyLimit) * 100), 100) : null,
    };
  }

  if (monthlyLimit !== null && usage >= monthlyLimit) {
    return {
      allowed: false,
      reason: "limit_reached",
      planKey,
      monthlyLimit,
      used: usage,
      remaining: 0,
      usagePercent: 100,
    };
  }

  return {
    allowed: true,
    planKey,
    monthlyLimit,
    used: usage,
    remaining: monthlyLimit === null ? null : Math.max(monthlyLimit - usage, 0),
    usagePercent: monthlyLimit ? Math.min(Math.round((usage / monthlyLimit) * 100), 100) : null,
  };
}

export function estimateCredits(featureKey: FeatureKey, outputTokens = 0): number {
  const base: Record<FeatureKey, number> = {
    copilot_chat: 3,
    knowledge_search: 1,
    knowledge_upload: 1,
    facebook_messenger: 2,
    instagram_dm: 2,
    whatsapp: 2,
    email_automation: 2,
    inspection_booking: 1,
    advanced_analytics: 1,
    team_management: 0,
  };
  return Math.max(base[featureKey], Math.ceil(outputTokens / 1500));
}

export function estimateCostMicros(
  inputTokens: number,
  outputTokens: number,
  inputUsdPerMillion = 0.5,
  outputUsdPerMillion = 2,
): number {
  const usd = (inputTokens / 1_000_000) * inputUsdPerMillion + (outputTokens / 1_000_000) * outputUsdPerMillion;
  return Math.max(0, Math.round(usd * 1_000_000));
}

export async function recordAIUsage(
  event: {
    requestId: string;
    orgId: string;
    userId?: string;
    featureKey: FeatureKey;
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    creditsUsed?: number;
    costMicros?: number;
    latencyMs?: number;
    status: "success" | "error" | "blocked";
    errorCode?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_ai_usage", {
    p_request_id: event.requestId,
    p_org_id: event.orgId,
    p_user_id: event.userId || null,
    p_feature_key: event.featureKey,
    p_provider: event.provider,
    p_model: event.model,
    p_input_tokens: event.inputTokens || 0,
    p_output_tokens: event.outputTokens || 0,
    p_cached_tokens: event.cachedTokens || 0,
    p_credits_used: event.creditsUsed || 0,
    p_cost_micros: event.costMicros || 0,
    p_latency_ms: event.latencyMs || null,
    p_status: event.status,
    p_error_code: event.errorCode || null,
    p_metadata: event.metadata || {},
  });

  if (error) console.error("AI usage recording failed:", error);
}
