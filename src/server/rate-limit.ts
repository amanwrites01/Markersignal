import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabase } from "@/lib/supabase/server";

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/**
 * Per-IP limit for signed-out actions (login, sign-up, password reset).
 * Runs with the server-only key so clients can't spend another IP's budget.
 * Fails open if the limiter itself errors, so auth never hard-fails on it.
 */
export async function limitByIp(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const ip = await clientIp();
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket: `${bucket}:${ip}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.code);
      return true;
    }
    return data === true;
  } catch {
    return true;
  }
}

/** Per-user limit for signed-in actions. Fails closed: if we can't check, we don't proceed. */
export async function limitByUser(supabase: ServerSupabase, bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.code);
    return false;
  }
  return data === true;
}
