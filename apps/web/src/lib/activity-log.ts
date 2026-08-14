type ActivityClient = {
  from: (table: string) => {
    insert: (value: Record<string, unknown>) => PromiseLike<{
      error?: { code?: string } | null;
    }>;
  };
};

type ActivityInput = {
  orgId: string;
  userId?: string | null;
  action: string;
  category: string;
  title: string;
  description?: string;
  impactSummary?: string;
  metadata?: Record<string, unknown>;
  completedAt?: string;
};

export async function recordClippyActivity(
  client: ActivityClient,
  input: ActivityInput,
): Promise<boolean> {
  try {
    const { error } = await client.from("clippy_activity_log").insert({
      org_id: input.orgId,
      user_id: input.userId || null,
      action: input.action,
      category: input.category,
      title: input.title,
      description: input.description || null,
      impact_summary: input.impactSummary || null,
      metadata: input.metadata || {},
      completed_at: input.completedAt || new Date().toISOString(),
    });
    if (error) {
      console.warn("Clippy activity logging failed", error.code);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      "Clippy activity logging failed",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
