import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { pathname } = request.nextUrl;

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
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user && !authDisabledForTesting) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    if (authSessionInvalid) clearSupabaseAuthCookies(request, redirect);
    return redirect;
  }

  const authPaths = ["/sign-in", "/signup"];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));
  if (isAuthPage && (user || authDisabledForTesting)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

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

  supabaseResponse.headers.set("Content-Security-Policy", csp);
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  if (authSessionInvalid) clearSupabaseAuthCookies(request, supabaseResponse);

  return supabaseResponse;
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
