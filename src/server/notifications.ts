"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";

const uuid = z.string().uuid();

function refresh() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // header badge
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!uuid.safeParse(id).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("recipient_id", viewer.id).is("read_at", null);
  if (error) return fail(dbError(error));
  refresh();
  return ok(undefined);
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", viewer.id).is("read_at", null);
  if (error) return fail(dbError(error));
  refresh();
  return ok(undefined, "All notifications marked as read");
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!uuid.safeParse(id).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id).eq("recipient_id", viewer.id);
  if (error) return fail(dbError(error));
  refresh();
  return ok(undefined, "Notification removed");
}
