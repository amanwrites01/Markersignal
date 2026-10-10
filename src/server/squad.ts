"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { squadRoleSchema } from "@/lib/validation/squad";

const uuid = z.string().uuid();


export async function saveSquadRole(campaignId: string, roleId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireRole("brand");
  if (!uuid.safeParse(campaignId).success || (roleId && !uuid.safeParse(roleId).success)) return fail("Not found.");
  const parsed = squadRoleSchema.safeParse(input);
  if (!parsed.success) return fail("Check the role details.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    title: v.title,
    description: v.description ?? null,
    category_id: v.categoryId ?? null,
    deliverable_type_id: v.deliverableTypeId ?? null,
    budget_cents: v.budget,
    headcount: v.headcount,
  };
  let id = roleId;
  if (roleId) {
    const { data, error } = await supabase.from("squad_roles").update(row).eq("id", roleId).eq("campaign_id", campaignId).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("Role not found.");
  } else {
    const { count } = await supabase.from("squad_roles").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId);
    if ((count ?? 0) >= 12) return fail("A squad can have up to 12 roles.");
    const { data, error } = await supabase.from("squad_roles").insert({ ...row, campaign_id: campaignId, sort_order: count ?? 0 }).select("id").single();
    if (error) return fail(dbError(error));
    id = data.id;
  }
  await supabase.from("squad_role_skills").delete().eq("squad_role_id", id!);
  if (v.skillIds.length) {
    const { error } = await supabase.from("squad_role_skills").insert([...new Set(v.skillIds)].map((s) => ({ squad_role_id: id!, skill_id: s })));
    if (error) return fail(dbError(error));
  }
  revalidatePath(`/brand/campaigns/${campaignId}/squad`);
  return ok({ id: id! }, roleId ? "Role updated" : "Role added");
}

export async function deleteSquadRole(campaignId: string, roleId: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(campaignId).success || !uuid.safeParse(roleId).success) return fail("Not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("squad_roles").delete().eq("id", roleId).eq("campaign_id", campaignId).select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Role not found.");
  revalidatePath(`/brand/campaigns/${campaignId}/squad`);
  return ok(undefined, "Role removed");
}
