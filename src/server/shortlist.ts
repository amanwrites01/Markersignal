"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";

const schema = z.object({ creatorId: z.string().uuid(), note: z.string().trim().max(500) });

export async function updateShortlistNote(input: unknown): Promise<ActionResult> {
  const viewer = await requireRole("brand");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Notes can be up to 500 characters.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_creators")
    .update({ note: parsed.data.note || null })
    .eq("brand_id", viewer.id)
    .eq("creator_id", parsed.data.creatorId)
    .select("creator_id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("This creator isn't on your shortlist.");
  revalidatePath("/brand/shortlist");
  return ok(undefined, "Note saved");
}
