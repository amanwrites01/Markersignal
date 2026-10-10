"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { computeCampaignMatches } from "@/lib/matching/service";
import { limitByUser } from "./rate-limit";

export async function refreshCampaignMatches(campaignId: string, squadRoleId?: string | null): Promise<ActionResult<{ count: number }>> {
  await requireRole("brand");
  if (!z.string().uuid().safeParse(campaignId).success) return fail("Campaign not found.");
  if (squadRoleId && !z.string().uuid().safeParse(squadRoleId).success) return fail("Role not found.");
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "match", 30, 3600))) return fail("Matches were refreshed many times recently. Try again later.");

  let override = undefined;
  if (squadRoleId) {
    const [{ data: role }, { data: roleSkills }] = await Promise.all([
      supabase.from("squad_roles").select("category_id, deliverable_type_id, budget_cents").eq("id", squadRoleId).eq("campaign_id", campaignId).maybeSingle(),
      supabase.from("squad_role_skills").select("skill_id").eq("squad_role_id", squadRoleId),
    ]);
    if (!role) return fail("Role not found.");
    override = {
      categoryId: role.category_id,
      skillIds: (roleSkills ?? []).map((r) => r.skill_id),
      deliverableTypeIds: role.deliverable_type_id ? [role.deliverable_type_id] : [],
      ...(role.budget_cents != null ? { budgetMaxCents: role.budget_cents } : {}),
    };
  }
  const result = await computeCampaignMatches(supabase, campaignId, await getTaxonomy(), { squadRoleId, override, keep: squadRoleId ? 12 : 50 });
  if ("error" in result) return fail(result.error);
  revalidatePath(`/brand/campaigns/${campaignId}`);
  revalidatePath(`/brand/campaigns/${campaignId}/squad`);
  return ok({ count: result.stored }, result.stored ? `Found ${result.stored} potential matches` : "No creators overlap with this brief yet");
}
