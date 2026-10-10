"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { limitByUser } from "./rate-limit";

const uuid = z.string().uuid();

export async function toggleShortlist(creatorId: string, save: boolean, note?: string): Promise<ActionResult> {
  const viewer = await requireRole("brand");
  if (!uuid.safeParse(creatorId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = save
    ? // DO NOTHING on conflict: clients may insert but not rewrite brand_id/creator_id.
      await supabase.from("saved_creators").upsert(
        { brand_id: viewer.id, creator_id: creatorId, note: note?.slice(0, 500) ?? null },
        { onConflict: "brand_id,creator_id", ignoreDuplicates: true },
      )
    : await supabase.from("saved_creators").delete().eq("brand_id", viewer.id).eq("creator_id", creatorId);
  if (error) return fail(dbError(error));
  revalidatePath("/brand/shortlist");
  revalidatePath("/brand/creators");
  return ok(undefined, save ? "Added to shortlist" : "Removed from shortlist");
}

const inviteSchema = z.object({
  campaignId: uuid,
  creatorId: uuid,
  message: z.string().trim().max(2000).optional().default(""),
  squadRoleId: uuid.nullable().optional(),
});

export async function inviteCreator(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("brand");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail("Check the invitation details.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "invite", 60, 3600))) return fail("You've sent a lot of invitations recently. Please try again later.");
  const { data, error } = await supabase.rpc("invite_creator", {
    p_campaign_id: parsed.data.campaignId,
    p_creator_id: parsed.data.creatorId,
    p_message: parsed.data.message,
    p_squad_role_id: (parsed.data.squadRoleId ?? null) as string,
  });
  if (error) return fail(dbError(error));
  revalidatePath(`/brand/campaigns/${parsed.data.campaignId}`);
  return ok({ id: data as string }, "Invitation sent");
}

export async function withdrawInvitation(invitationId: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(invitationId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_invitation", { p_invitation_id: invitationId });
  if (error) return fail(dbError(error));
  revalidatePath("/brand/campaigns", "layout");
  return ok(undefined, "Invitation withdrawn");
}
