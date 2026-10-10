import type { PostgrestError } from "@supabase/supabase-js";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Turns a database error into a message safe to show users. Workflow
 * functions raise readable messages with SQLSTATE P0001 (validation) or 42501
 * (authorization); anything else becomes a generic message and is logged
 * server-side without request data.
 */
export function dbError(error: PostgrestError | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code === "P0001" || error.code === "P0002") return capitalize(error.message);
  if (error.code === "42501") return error.message && error.message !== "not authorized" ? capitalize(error.message) : "You don't have permission to do that.";
  if (error.code === "23505") return "That already exists.";
  if (error.code === "23514") return "Some values are outside the allowed range.";
  if (error.code === "PGRST116") return "Not found.";
  console.error("[db]", error.code, error.message);
  return fallback;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
