import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CampaignInput } from "@/lib/validation/campaign";

export async function getCampaignDetail(id: string) {
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, brand_profiles(id, brand_name, slug, logo_path, description, website), creator_categories(name), industries(name)")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return null;
  const [deliverables, platforms, styles, skills] = await Promise.all([
    supabase.from("campaign_deliverables").select("*, deliverable_types(name), platforms(name)").eq("campaign_id", id).order("sort_order"),
    supabase.from("campaign_platforms").select("platform_id, platforms(name)").eq("campaign_id", id),
    supabase.from("campaign_style_tags").select("style_tag_id, creative_style_tags(name)").eq("campaign_id", id),
    supabase.from("campaign_skills").select("skill_id, skills(name)").eq("campaign_id", id),
  ]);
  return {
    campaign,
    deliverables: deliverables.data ?? [],
    platforms: platforms.data ?? [],
    styles: styles.data ?? [],
    skills: skills.data ?? [],
  };
}

export type CampaignDetail = NonNullable<Awaited<ReturnType<typeof getCampaignDetail>>>;

const money = (c: number | null) => (c == null ? "" : String(c / 100));

export function campaignToInput(d: CampaignDetail): CampaignInput {
  const c = d.campaign;
  return {
    title: c.title,
    objective: c.objective ?? "",
    description: c.description ?? "",
    productDescription: c.product_description ?? "",
    targetAudience: c.target_audience ?? "",
    categoryId: c.category_id,
    industryId: c.industry_id,
    budgetMin: money(c.budget_min_cents),
    budgetMax: money(c.budget_max_cents),
    currency: c.currency as "USD",
    deadline: c.deadline ?? "",
    applicationDeadline: c.application_deadline ?? "",
    locationRequirement: c.location_requirement ?? "",
    revisionsExpected: c.revisions_expected,
    usageOrganic: c.usage_organic,
    usagePaidAds: c.usage_paid_ads,
    usageDurationMonths: c.usage_duration_months,
    usageTerritory: c.usage_territory ?? "",
    exclusivityRequired: c.exclusivity_required,
    rawFilesRequired: c.raw_files_required,
    usageNotes: c.usage_notes ?? "",
    visibility: c.visibility as "public",
    blindReview: c.blind_review,
    aiAssisted: c.ai_assisted,
    deliverables: d.deliverables.map((x) => ({
      deliverableTypeId: x.deliverable_type_id,
      platformId: x.platform_id,
      quantity: x.quantity,
      description: x.description ?? "",
    })),
    platformIds: d.platforms.map((p) => p.platform_id),
    styleIds: d.styles.map((s) => s.style_tag_id),
    skillIds: d.skills.map((s) => s.skill_id),
  };
}
