"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { campaignSchema, type CampaignValues } from "@/lib/validation/campaign";

const uuid = z.string().uuid();

function toRow(v: CampaignValues) {
  return {
    title: v.title,
    objective: v.objective ?? null,
    description: v.description ?? null,
    product_description: v.productDescription ?? null,
    target_audience: v.targetAudience ?? null,
    category_id: v.categoryId ?? null,
    industry_id: v.industryId ?? null,
    budget_min_cents: v.budgetMin,
    budget_max_cents: v.budgetMax,
    currency: v.currency,
    deadline: v.deadline,
    application_deadline: v.applicationDeadline,
    location_requirement: v.locationRequirement ?? null,
    revisions_expected: v.revisionsExpected ?? null,
    usage_organic: v.usageOrganic,
    usage_paid_ads: v.usagePaidAds,
    usage_duration_months: v.usageDurationMonths ?? null,
    usage_territory: v.usageTerritory ?? null,
    exclusivity_required: v.exclusivityRequired,
    raw_files_required: v.rawFilesRequired,
    usage_notes: v.usageNotes ?? null,
    visibility: v.visibility,
    blind_review: v.blindReview,
    ai_assisted: v.aiAssisted,
  };
}

async function replaceRequirements(supabase: ServerSupabase, campaignId: string, v: CampaignValues) {
  const steps = [
    supabase.from("campaign_deliverables").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_platforms").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_style_tags").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_skills").delete().eq("campaign_id", campaignId),
  ];
  for (const s of steps) {
    const { error } = await s;
    if (error) return error;
  }
  const inserts = [
    v.deliverables.length
      ? supabase.from("campaign_deliverables").insert(
          v.deliverables.map((d, i) => ({
            campaign_id: campaignId,
            deliverable_type_id: d.deliverableTypeId,
            platform_id: d.platformId ?? null,
            quantity: d.quantity,
            description: d.description ?? null,
            sort_order: i,
          })),
        )
      : null,
    v.platformIds.length ? supabase.from("campaign_platforms").insert([...new Set(v.platformIds)].map((id) => ({ campaign_id: campaignId, platform_id: id }))) : null,
    v.styleIds.length ? supabase.from("campaign_style_tags").insert([...new Set(v.styleIds)].map((id) => ({ campaign_id: campaignId, style_tag_id: id }))) : null,
    v.skillIds.length ? supabase.from("campaign_skills").insert([...new Set(v.skillIds)].map((id) => ({ campaign_id: campaignId, skill_id: id }))) : null,
  ];
  for (const q of inserts) {
    if (!q) continue;
    const { error } = await q;
    if (error) return error;
  }
  return null;
}

/** Creates or updates a campaign. New campaigns are always drafts — publishing is a separate, explicit step. */
export async function saveCampaign(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireRole("brand");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  if (id && !uuid.safeParse(id).success) return fail("Campaign not found.");
  const supabase = await createClient();
  const row = toRow(parsed.data);

  let campaignId = id;
  if (id) {
    const { data, error } = await supabase.from("campaigns").update(row).eq("id", id).eq("brand_id", viewer.id).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("This campaign can't be edited (it may be closed or archived).");
  } else {
    const { data, error } = await supabase.from("campaigns").insert({ ...row, brand_id: viewer.id }).select("id").single();
    if (error) return fail(dbError(error));
    campaignId = data.id;
  }
  const reqError = await replaceRequirements(supabase, campaignId!, parsed.data);
  if (reqError) return fail(dbError(reqError));

  revalidatePath("/brand/campaigns", "layout");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/explore/campaigns");
  return ok({ id: campaignId! }, id ? "Campaign saved" : "Draft created");
}

export async function transitionCampaign(id: string, status: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(id).success) return fail("Campaign not found.");
  const parsed = z.enum(["published", "paused", "closed", "archived"]).safeParse(status);
  if (!parsed.success) return fail("Invalid status.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_campaign", { p_campaign_id: id, p_status: parsed.data });
  if (error) return fail(dbError(error));
  revalidatePath("/brand", "layout");
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/explore/campaigns");
  revalidatePath("/");
  const messages: Record<string, string> = {
    published: "Campaign published",
    paused: "Applications paused",
    closed: "Campaign closed",
    archived: "Campaign archived",
  };
  return ok(undefined, messages[parsed.data]);
}

export async function deleteDraftCampaign(id: string): Promise<ActionResult> {
  const viewer = await requireRole("brand");
  if (!uuid.safeParse(id).success) return fail("Campaign not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").delete().eq("id", id).eq("brand_id", viewer.id).eq("status", "draft").select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Only drafts without proposals can be deleted. Archive it instead.");
  revalidatePath("/brand/campaigns");
  redirect("/brand/campaigns");
}
