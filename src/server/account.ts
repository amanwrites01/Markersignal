"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { changePasswordSchema, deletionRequestSchema } from "@/lib/validation/account";
import { limitByUser } from "./rate-limit";

/** Re-checks the current password before changing it, so an unattended session can't silently take over the account. */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  if (!viewer.email) return fail("Your account has no email address.");
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "password-change", 5, 900))) return fail("Too many attempts. Please wait a few minutes and try again.");

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: viewer.email, password: parsed.data.currentPassword });
  if (reauthError) return fail("Your current password is incorrect.", { currentPassword: ["Your current password is incorrect"] });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") return fail("Choose a stronger password.", { password: [error.message] });
    if (error.code === "same_password") return fail("Choose a different password.", { password: ["Choose a different password"] });
    console.error("[account] changePassword", error.code);
    return fail("We couldn't update your password. Please try again.");
  }
  return ok(undefined, "Password updated");
}

/** Revokes every session for this account (all devices), then returns to the home page. */
export async function signOutEverywhere(): Promise<void> {
  await requireViewer();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/auth/login");
}

export async function requestAccountDeletion(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = deletionRequestSchema.safeParse(input);
  if (!parsed.success) return fail("Type DELETE to confirm.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.from("account_deletion_requests").insert({ profile_id: viewer.id, reason: parsed.data.reason || null });
  if (error?.code === "23505") return fail("You already have a pending deletion request.");
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  return ok(undefined, "Deletion request received");
}

export async function cancelAccountDeletion(requestId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.string().uuid().safeParse(requestId).success) return fail("Request not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("profile_id", viewer.id)
    .eq("status", "pending")
    .select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("This request can no longer be cancelled.");
  revalidatePath("/", "layout");
  return ok(undefined, "Deletion request cancelled");
}
