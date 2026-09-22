import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserRecoveryClient: SupabaseClient | null = null;

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase public environment variables are not configured");
  }

  return { url, key };
}

/**
 * Password reset emails must not use PKCE because the email may be opened in
 * a different browser from the one that requested it. With the implicit flow,
 * Supabase returns the one-time recovery session in the URL fragment instead.
 */
export function createPasswordResetEmailClient(): SupabaseClient {
  const { url, key } = getPublicSupabaseConfig();

  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Keep one in-memory client for the reset screen. Supabase consumes and clears
 * the recovery tokens from the URL, so subsequent renders must reuse it.
 */
export function getPasswordRecoveryClient(): SupabaseClient {
  if (browserRecoveryClient) return browserRecoveryClient;

  const { url, key } = getPublicSupabaseConfig();
  browserRecoveryClient = createClient(url, key, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: true,
    },
  });

  return browserRecoveryClient;
}
