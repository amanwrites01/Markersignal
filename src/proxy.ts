import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/creator", "/brand", "/notifications", "/settings", "/projects", "/messages", "/onboarding"];
const AUTH_PAGES = ["/auth/login", "/auth/sign-up"];

/**
 * Refreshes the Supabase session on every request and keeps signed-out users
 * away from protected areas. Role checks happen in layouts; RLS is the final
 * guard on every record.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // getClaims() refreshes the session if needed and verifies the JWT signature
  // locally against the project's published signing keys (no auth-server
  // round trip per request). Never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? { id: data.claims.sub } : null;

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    if (path.startsWith("/creator")) {
      url.pathname = "/auth/login/creator";
    } else if (path.startsWith("/brand")) {
      url.pathname = "/auth/login/brand";
    } else {
      url.pathname = "/auth/login";
    }
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectWithCookies(url, response);
  }

  if (user && (AUTH_PAGES.includes(path) || path.startsWith("/auth/login"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
