import "server-only";
import { cookies } from "next/headers";

/**
 * TEMPORARY development aid. While real email delivery isn't configured,
 * auth codes are generated server-side (admin API, no email sent) and shown
 * on screen to the person who requested them. Turn off with
 * DEV_SHOW_EMAIL_CODES=false as soon as SMTP is set up.
 */
export function devEmailCodesEnabled(): boolean {
  return process.env.DEV_SHOW_EMAIL_CODES === "true";
}

export type CodeKind = "signup" | "magiclink" | "recovery";
type Stash = { email: string; kind: CodeKind; code: string };
const COOKIE = "ms_dev_code";

export async function stashDevCode(stash: Stash) {
  (await cookies()).set(COOKIE, JSON.stringify(stash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth",
    maxAge: 15 * 60,
  });
}

export async function readDevCode(email: string | undefined): Promise<Stash | null> {
  if (!devEmailCodesEnabled() || !email) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Stash;
    return s.email === email.toLowerCase() ? s : null;
  } catch {
    return null;
  }
}

export async function clearDevCode() {
  (await cookies()).delete({ name: COOKIE, path: "/auth" });
}
