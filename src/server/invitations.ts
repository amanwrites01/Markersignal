"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";

const schema = z.object({ invitationId: z.string().uuid(), accept: z.boolean() });

/** Creator accepts or declines an invitation. Accepting does not commit to anything — it signals intent to send a proposal. */
export async function respondInvitation(input: unknown): Promise<ActionResult> {
  await requireRole("creator");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Invitation not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_invitation", { p_invitation_id: parsed.data.invitationId, p_accept: parsed.data.accept });
  if (error) return fail(dbError(error));
  revalidatePath("/creator/opportunities");
  revalidatePath("/creator/dashboard");
  return ok(undefined, parsed.data.accept ? "Invitation accepted — send your proposal when ready" : "Invitation declined");
}
