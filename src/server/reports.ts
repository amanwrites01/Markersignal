"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { limitByUser } from "./rate-limit";

const reportSchema = z.object({
  entityType: z.enum(["creator_profile", "brand_profile", "campaign", "review", "message", "portfolio_item", "proposal"]),
  entityId: z.string().uuid(),
  reason: z.enum(["spam", "harassment", "misleading", "inappropriate", "ip_violation", "fraud", "other"]),
  details: z.string().trim().max(3000).optional(),
});

export async function submitReport(input: unknown): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a reason for the report.");
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "report", 10, 3600))) return fail("Too many reports. Please try again later.");
  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.id,
    entity_type: parsed.data.entityType,
    entity_id: parsed.data.entityId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error?.code === "23505") return ok(undefined, "You've already reported this. Our team will review it.");
  if (error) return fail(dbError(error));
  return ok(undefined, "Thanks — our moderation team will review this report.");
}
