import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

/**
 * Lands email links (sign-up confirmation, password recovery). Supports the
 * PKCE `code` flow and the `token_hash` flow, then sends the user on to a
 * same-site path only.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), "/onboarding");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const oauthError = searchParams.get("error");

  if (oauthError) {
    const failure = new URL("/auth/login", origin);
    failure.searchParams.set("error", "link");
    return NextResponse.redirect(failure);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/auth/reset-password" : next, origin));
  }

  const failure = new URL("/auth/login", origin);
  failure.searchParams.set("error", "link");
  return NextResponse.redirect(failure);
}
