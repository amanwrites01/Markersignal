import "server-only";
import { createClient } from "@/lib/supabase/server";
import { date, int, intList, money, page as pageOf, str, type RawParams } from "./params";

export const PER_PAGE = 24;

export async function searchCreatorsFromParams(params: RawParams) {
  const supabase = await createClient();
  const page = pageOf(params);
  const availability = str(params, "availability");
  const sort = str(params, "sort");
  const { data, error } = await supabase.rpc("search_creators", {
    p_query: str(params, "q"),
    p_category_id: int(params, "category"),
    p_style_ids: intList(params, "style"),
    p_skill_id: int(params, "skill"),
    p_platform_id: int(params, "platform"),
    p_availability: availability === "available" || availability === "limited" ? availability : undefined,
    p_max_rate_cents: money(params, "maxRate"),
    p_country: str(params, "country"),
    p_language: str(params, "language"),
    p_sort: ["relevance", "newest", "rate_low", "rate_high"].includes(sort ?? "") ? sort : "relevance",
    p_limit: PER_PAGE,
    p_offset: (page - 1) * PER_PAGE,
  });
  if (error) console.error("[search_creators]", error.code);
  const rows = data ?? [];
  return { rows, total: rows[0]?.total_count ?? 0, page, failed: Boolean(error) };
}

export async function searchCampaignsFromParams(params: RawParams) {
  const supabase = await createClient();
  const page = pageOf(params);
  const sort = str(params, "sort");
  const { data, error } = await supabase.rpc("search_campaigns", {
    p_query: str(params, "q"),
    p_category_id: int(params, "category"),
    p_platform_id: int(params, "platform"),
    p_deliverable_type_id: int(params, "deliverable"),
    p_min_budget_cents: money(params, "minBudget"),
    p_deadline_before: date(params, "deadlineBefore"),
    p_sort: ["newest", "relevance", "deadline", "budget"].includes(sort ?? "") ? sort : "newest",
    p_limit: PER_PAGE,
    p_offset: (page - 1) * PER_PAGE,
  });
  if (error) console.error("[search_campaigns]", error.code);
  const rows = data ?? [];
  return { rows, total: rows[0]?.total_count ?? 0, page, failed: Boolean(error) };
}

export const CREATOR_FILTER_KEYS = ["category", "style", "skill", "platform", "availability", "maxRate", "country", "language"];
export const CAMPAIGN_FILTER_KEYS = ["category", "platform", "deliverable", "minBudget", "deadlineBefore"];
