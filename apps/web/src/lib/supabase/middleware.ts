import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const protectedPaths = ["/dashboard","/inbox","/deals","/copilot","/team","/integrations","/import","/analytics","/admin","/onboarding","/briefing","/monitoring","/property"];
  if (protectedPaths.some(p => pathname.startsWith(p)) && !user) {
    const url = request.nextUrl.clone(); url.pathname = "/sign-in"; return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
