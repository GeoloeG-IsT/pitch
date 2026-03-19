import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/access-expired"];
const FOUNDER_ONLY_PATHS = ["/dashboard", "/documents"];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // /pitch with valid share token -- pass through (token validated in page)
  if (pathname === "/pitch" && searchParams.has("token")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Public paths -- no auth required, just refresh session
  if (PUBLIC_PATHS.includes(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Auth callback -- pass through
  if (pathname.startsWith("/auth/")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // All other paths require auth
  const { user, supabase, supabaseResponse } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based redirects: check if user is investor trying to access founder-only pages
  if (FOUNDER_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "investor") {
      const url = request.nextUrl.clone();
      url.pathname = "/pitch";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
