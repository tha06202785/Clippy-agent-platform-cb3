import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/inbox",
  "/deals",
  "/copilot",
  "/team",
  "/integrations",
  "/import",
  "/analytics",
  "/admin",
  "/onboarding",
  "/briefing",
  "/monitoring",
  "/property",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase public configuration is missing");
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", pathname);
      url.searchParams.set("error", "auth_unavailable");
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  let authSessionInvalid = false;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authSessionInvalid = Boolean(result.error);
  } catch (error) {
    authSessionInvalid = true;
    console.warn("Supabase session refresh failed", error);
  }

  // A test bypass must never be possible in a production deployment.
  const authDisabledForTesting =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_AUTH_BYPASS === "true";

  if (isProtected && !user && !authDisabledForTesting) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    if (authSessionInvalid) clearSupabaseAuthCookies(request, redirect);
    return applySecurityHeaders(redirect);
  }

  const authPaths = ["/sign-in", "/signup"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && (user || authDisabledForTesting)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (authSessionInvalid) clearSupabaseAuthCookies(request, supabaseResponse);

  return applySecurityHeaders(supabaseResponse);
}

function applySecurityHeaders(response: NextResponse) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.accounts.dev https://js.stripe.com https://*.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://img.clerk.com https://images.unsplash.com https://*.supabase.co",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.vercel.com https://ollama.com https://*.posthog.com https://api.stripe.com wss://*.clerk.accounts.dev",
    "frame-src 'self' https://clerk.accounts.dev https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  return response;
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
) {
  request.cookies
    .getAll()
    .filter(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    )
    .forEach(({ name }) => response.cookies.delete(name));
}
