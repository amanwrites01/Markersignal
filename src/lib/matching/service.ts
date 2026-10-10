import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Taxonomy } from "@/lib/data/taxonomy";
import { ALGORITHM_VERSION, explainForCreator, scoreMatch, type MatchCampaign, type MatchCreator, type MatchNames, type MatchResult } from "./score";

export function namesFrom(t: Taxonomy): MatchNames {
  const m = (xs: { id: number; name: string }[]) => new Map(xs.map((x) => [x.id, x.name]));
  return {
    skills: m(t.skills),
    styles: m(t.styles),
    deliverableTypes: m(t.deliverableTypes),
    industries: m(t.industries),
    categories: m(t.categories),
    platforms: m(t.platforms),
  };
}

export async function loadMatchCampaign(supabase: ServerSupabase, campaignId: string): Promise<(MatchCampaign & { id: string; title: string }) | null> {
  const { data: c } = await supabase
    .from("campaigns")
    .select("id, title, category_id, industry_id, budget_max_cents, currency, deadline")
    .eq("id", campaignId)
    .maybeSingle();
  if (!c) return null;
  const [styles, skills, platforms, deliverables] = await Promise.all([
    supabase.from("campaign_style_tags").select("style_tag_id").eq("campaign_id", campaignId),
    supabase.from("campaign_skills").select("skill_id").eq("campaign_id", campaignId),
    supabase.from("campaign_platforms").select("platform_id").eq("campaign_id", campaignId),
    supabase.from("campaign_deliverables").select("deliverable_type_id").eq("campaign_id", campaignId),
  ]);
  return {
    id: c.id,
    title: c.title,
    categoryId: c.category_id,
    industryId: c.industry_id,
    styleIds: (styles.data ?? []).map((r) => r.style_tag_id),
    skillIds: (skills.data ?? []).map((r) => r.skill_id),
    platformIds: (platforms.data ?? []).map((r) => r.platform_id),
    deliverableTypeIds: (deliverables.data ?? []).map((r) => r.deliverable_type_id),
    budgetMaxCents: c.budget_max_cents,
    currency: c.currency,
    deadline: c.deadline,
  };
}

/** Batch-loads match inputs for many creators (6 queries regardless of count). */
export async function loadMatchCreators(supabase: ServerSupabase, ids: string[]): Promise<MatchCreator[]> {
  if (!ids.length) return [];
  const [profiles, cats, styles, skills, platforms, portfolio, services] = await Promise.all([
    supabase.from("creator_profiles").select("id, availability, available_from, starting_rate_cents, currency").in("id", ids),
    supabase.from("creator_category_links").select("creator_id, category_id").in("creator_id", ids),
    supabase.from("creator_style_tags").select("creator_id, style_tag_id").in("creator_id", ids),
    supabase.from("creator_skills").select("creator_id, skill_id").in("creator_id", ids),
    supabase.from("creator_platforms").select("creator_id, platform_id").in("creator_id", ids),
    supabase.from("portfolio_items").select("creator_id, deliverable_type_id, category_id, industry_id, platform_id").in("creator_id", ids),
    supabase.from("creator_services").select("creator_id, deliverable_type_id, starting_price_cents, currency").eq("active", true).in("creator_id", ids),
  ]);
  const group = <T extends { creator_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) m.set(r.creator_id, [...(m.get(r.creator_id) ?? []), r]);
    return m;
  };
  const gCats = group(cats.data), gStyles = group(styles.data), gSkills = group(skills.data), gPlat = group(platforms.data), gPort = group(portfolio.data), gSvc = group(services.data);
  return (profiles.data ?? []).map((p) => ({
    id: p.id,
    availability: p.availability,
    availableFrom: p.available_from,
    startingRateCents: p.starting_rate_cents,
    currency: p.currency,
    categoryIds: (gCats.get(p.id) ?? []).map((r) => r.category_id),
    styleIds: (gStyles.get(p.id) ?? []).map((r) => r.style_tag_id),
    skillIds: (gSkills.get(p.id) ?? []).map((r) => r.skill_id),
    platformIds: (gPlat.get(p.id) ?? []).map((r) => r.platform_id),
    portfolio: (gPort.get(p.id) ?? []).map((r) => ({ deliverableTypeId: r.deliverable_type_id, categoryId: r.category_id, industryId: r.industry_id, platformId: r.platform_id })),
    services: (gSvc.get(p.id) ?? []).map((r) => ({ deliverableTypeId: r.deliverable_type_id, startingPriceCents: r.starting_price_cents, currency: r.currency })),
  }));
}

/** Scores candidates for a campaign the caller owns and stores the top results with their factors. */
export async function computeCampaignMatches(
  supabase: ServerSupabase,
  campaignId: string,
  taxonomy: Taxonomy,
  opts: { squadRoleId?: string | null; override?: Partial<MatchCampaign>; keep?: number } = {},
): Promise<{ results: MatchResult[]; stored: number } | { error: string }> {
  const base = await loadMatchCampaign(supabase, campaignId);
  if (!base) return { error: "Campaign not found." };
  const campaign: MatchCampaign = { ...base, ...opts.override };
  const { data: candidates, error } = await supabase.rpc("campaign_match_candidates", { p_campaign_id: campaignId, p_limit: 300 });
  if (error) return { error: "Couldn't load candidates." };
  const creators = await loadMatchCreators(supabase, (candidates ?? []).map((c) => c.creator_id));
  const names = namesFrom(taxonomy);
  const results = creators
    .map((c) => scoreMatch(campaign, c, names))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.keep ?? 50);
  const { data: stored, error: storeError } = await supabase.rpc("store_match_results", {
    p_campaign_id: campaignId,
    p_squad_role_id: (opts.squadRoleId ?? null) as string, // SQL accepts null; generated types mark args non-null
    p_algorithm_version: ALGORITHM_VERSION,
    p_results: results.map((r) => ({ creator_id: r.creatorId, score: r.score, factors: { tier: r.tier, confidence: r.confidence, items: r.factors }, explanation: r.explanation })),
  });
  if (storeError) return { error: "Couldn't save match results." };
  return { results, stored: stored ?? 0 };
}

/** Published campaigns ranked for one creator. Computed on request (not stored). */
export async function recommendCampaignsForCreator(supabase: ServerSupabase, creatorId: string, taxonomy: Taxonomy, limit = 6) {
  // Creator inputs and open campaigns are independent — fetch them together.
  const [[creator], { data: campaigns }] = await Promise.all([
    loadMatchCreators(supabase, [creatorId]),
    supabase.rpc("search_campaigns", { p_sort: "newest", p_limit: 40 }),
  ]);
  if (!creator) return [];
  if (!campaigns?.length) return [];
  const ids = campaigns.map((c) => c.id);
  const [styles, skills, platforms, deliverables, meta] = await Promise.all([
    supabase.from("campaign_style_tags").select("campaign_id, style_tag_id").in("campaign_id", ids),
    supabase.from("campaign_skills").select("campaign_id, skill_id").in("campaign_id", ids),
    supabase.from("campaign_platforms").select("campaign_id, platform_id").in("campaign_id", ids),
    supabase.from("campaign_deliverables").select("campaign_id, deliverable_type_id").in("campaign_id", ids),
    supabase.from("campaigns").select("id, category_id, industry_id").in("id", ids),
  ]);
  const by = <T extends { campaign_id: string }, K extends keyof T>(rows: T[] | null, key: K, id: string) =>
    (rows ?? []).filter((r) => r.campaign_id === id).map((r) => r[key] as number);
  const names = namesFrom(taxonomy);
  return campaigns
    .map((c) => {
      const m = meta.data?.find((x) => x.id === c.id);
      const result = scoreMatch(
        {
          categoryId: m?.category_id ?? null,
          industryId: m?.industry_id ?? null,
          styleIds: by(styles.data, "style_tag_id", c.id),
          skillIds: by(skills.data, "skill_id", c.id),
          platformIds: by(platforms.data, "platform_id", c.id),
          deliverableTypeIds: by(deliverables.data, "deliverable_type_id", c.id),
          budgetMaxCents: c.budget_max_cents,
          currency: c.currency,
          deadline: c.deadline,
        },
        creator,
        names,
      );
      return { campaign: c, match: { ...result, explanation: explainForCreator(result) } };
    })
    .filter((x) => x.match.score >= 35)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
