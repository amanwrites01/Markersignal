/**
 * Creative DNA matching — deterministic baseline.
 *
 * Scores how well a creator's stated profile and portfolio evidence fit a
 * campaign's stated requirements. It is an estimate from available data, not
 * a measure of quality or likely success.
 *
 * Deliberately NOT inputs: age, gender, ethnicity, religion, health,
 * nationality, follower counts, or location (location only appears when a
 * campaign states an on-site requirement, and even then is shown, not scored).
 *
 * Factors with no data on either side are excluded and the remaining weights
 * are renormalised, so a sparse brief doesn't punish every creator equally.
 */

export const ALGORITHM_VERSION = "dna-1.0";

export type FactorKey = "skills" | "style" | "portfolio" | "deliverables" | "category" | "platforms" | "budget" | "availability";

export const WEIGHTS: Record<FactorKey, number> = {
  skills: 18,
  style: 18,
  portfolio: 14,
  deliverables: 14,
  category: 8,
  platforms: 10,
  budget: 12,
  availability: 6,
};

export const FACTOR_LABELS: Record<FactorKey, string> = {
  skills: "Relevant skills",
  style: "Creative-style compatibility",
  portfolio: "Portfolio relevance",
  deliverables: "Deliverable experience",
  category: "Category fit",
  platforms: "Platform expertise",
  budget: "Budget compatibility",
  availability: "Availability vs deadline",
};

export type MatchCampaign = {
  categoryId: number | null;
  industryId: number | null;
  styleIds: number[];
  skillIds: number[];
  platformIds: number[];
  deliverableTypeIds: number[];
  budgetMaxCents: number | null;
  currency: string;
  deadline: string | null; // YYYY-MM-DD
};

export type MatchPortfolioItem = {
  deliverableTypeId: number | null;
  categoryId: number | null;
  industryId: number | null;
  platformId: number | null;
};

export type MatchCreator = {
  id: string;
  categoryIds: number[];
  styleIds: number[];
  skillIds: number[];
  platformIds: number[];
  availability: "available" | "limited" | "unavailable" | string;
  availableFrom: string | null;
  startingRateCents: number | null;
  currency: string;
  portfolio: MatchPortfolioItem[];
  services: { deliverableTypeId: number | null; startingPriceCents: number | null; currency: string }[];
};

/** Names used to write explanations. */
export type MatchNames = {
  skills: Map<number, string>;
  styles: Map<number, string>;
  deliverableTypes: Map<number, string>;
  industries: Map<number, string>;
  categories: Map<number, string>;
  platforms: Map<number, string>;
};

export type Factor = {
  key: FactorKey;
  label: string;
  weight: number;
  /** 0..1, or null when there isn't enough data to judge. */
  score: number | null;
  detail: string;
  /** Short phrase for the explanation sentence when this factor is strong. */
  positive?: string;
  /** Short phrase when this factor is weak. */
  caution?: string;
};

export type MatchResult = {
  creatorId: string;
  score: number; // 0..100
  tier: "strong" | "good" | "partial" | "weak";
  confidence: "high" | "medium" | "low";
  factors: Factor[];
  explanation: string;
  algorithmVersion: string;
};

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const intersect = (a: number[], b: number[]) => {
  const s = new Set(b);
  return uniq(a).filter((x) => s.has(x));
};
const listNames = (ids: number[], names: Map<number, string>, max = 2, keepCase = false) =>
  ids
    .map((id) => names.get(id))
    .filter((n): n is string => Boolean(n))
    .slice(0, max)
    .map((n) => (keepCase ? n : n.toLowerCase()))
    .join(" and ");

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

export function scoreMatch(campaign: MatchCampaign, creator: MatchCreator, names: MatchNames, today: string = new Date().toISOString().slice(0, 10)): MatchResult {
  const factors: Factor[] = [];

  // Skills — share of requested skills the creator lists.
  if (campaign.skillIds.length) {
    const hit = intersect(campaign.skillIds, creator.skillIds);
    const s = hit.length / uniq(campaign.skillIds).length;
    factors.push({
      key: "skills", label: FACTOR_LABELS.skills, weight: WEIGHTS.skills, score: s,
      detail: `${hit.length} of ${uniq(campaign.skillIds).length} requested skills`,
      positive: hit.length ? `lists ${listNames(hit, names.skills)}` : undefined,
      caution: s < 0.5 ? "covers fewer than half of the requested skills" : undefined,
    });
  } else factors.push({ key: "skills", label: FACTOR_LABELS.skills, weight: WEIGHTS.skills, score: null, detail: "No skills specified in the brief" });

  // Creative style — share of desired styles the creator identifies with.
  if (campaign.styleIds.length) {
    const hit = intersect(campaign.styleIds, creator.styleIds);
    const s = hit.length / uniq(campaign.styleIds).length;
    factors.push({
      key: "style", label: FACTOR_LABELS.style, weight: WEIGHTS.style, score: s,
      detail: hit.length ? `Shares ${hit.map((id) => names.styles.get(id)).filter(Boolean).join(", ")}` : "No shared style tags",
      positive: hit.length ? `works in a ${listNames(hit, names.styles)} style` : undefined,
      caution: hit.length === 0 ? "doesn't list the creative style you asked for" : undefined,
    });
  } else factors.push({ key: "style", label: FACTOR_LABELS.style, weight: WEIGHTS.style, score: null, detail: "No style specified in the brief" });

  // Portfolio relevance — pieces in the same industry or category.
  if (campaign.industryId || campaign.categoryId) {
    const industryHits = campaign.industryId ? creator.portfolio.filter((p) => p.industryId === campaign.industryId).length : 0;
    const categoryHits = campaign.categoryId ? creator.portfolio.filter((p) => p.categoryId === campaign.categoryId).length : 0;
    const s = Math.min(1, (campaign.industryId ? Math.min(industryHits, 3) / 3 : 0) * (campaign.categoryId ? 0.65 : 1) + (campaign.categoryId ? (Math.min(categoryHits, 3) / 3) * (campaign.industryId ? 0.35 : 1) : 0));
    const industry = campaign.industryId ? names.industries.get(campaign.industryId) : undefined;
    factors.push({
      key: "portfolio", label: FACTOR_LABELS.portfolio, weight: WEIGHTS.portfolio, score: creator.portfolio.length ? s : 0,
      detail: industry ? `${industryHits} portfolio piece${industryHits === 1 ? "" : "s"} in ${industry}` : `${categoryHits} relevant portfolio piece${categoryHits === 1 ? "" : "s"}`,
      positive: industryHits > 0 && industry ? `has relevant ${industry.toLowerCase()} portfolio work` : categoryHits > 0 ? "has relevant portfolio work" : undefined,
      caution: creator.portfolio.length === 0 ? "has no portfolio pieces yet" : s === 0 ? "has no portfolio pieces in this industry yet" : undefined,
    });
  } else factors.push({ key: "portfolio", label: FACTOR_LABELS.portfolio, weight: WEIGHTS.portfolio, score: null, detail: "No industry or category in the brief" });

  // Deliverable experience — requested deliverable types evidenced by portfolio or services.
  const wanted = uniq(campaign.deliverableTypeIds);
  if (wanted.length) {
    const evidenced = new Set<number>([
      ...creator.portfolio.map((p) => p.deliverableTypeId).filter((x): x is number => x != null),
      ...creator.services.map((s) => s.deliverableTypeId).filter((x): x is number => x != null),
    ]);
    const hit = wanted.filter((id) => evidenced.has(id));
    const s = hit.length / wanted.length;
    factors.push({
      key: "deliverables", label: FACTOR_LABELS.deliverables, weight: WEIGHTS.deliverables, score: s,
      detail: `Shows experience with ${hit.length} of ${wanted.length} requested deliverable types`,
      positive: hit.length ? `specialises in ${listNames(hit, names.deliverableTypes)}` : undefined,
      caution: hit.length === 0 ? "hasn't shown the requested deliverable types yet" : undefined,
    });
  } else factors.push({ key: "deliverables", label: FACTOR_LABELS.deliverables, weight: WEIGHTS.deliverables, score: null, detail: "No deliverables in the brief" });

  // Category fit.
  if (campaign.categoryId) {
    const on = creator.categoryIds.includes(campaign.categoryId);
    factors.push({
      key: "category", label: FACTOR_LABELS.category, weight: WEIGHTS.category, score: on ? 1 : 0,
      detail: on ? `Is a ${names.categories.get(campaign.categoryId) ?? "matching creator"}` : `Not listed as ${names.categories.get(campaign.categoryId) ?? "this category"}`,
    });
  } else factors.push({ key: "category", label: FACTOR_LABELS.category, weight: WEIGHTS.category, score: null, detail: "Any category" });

  // Platform expertise — listed platforms or portfolio on them.
  if (campaign.platformIds.length) {
    const theirs = new Set([...creator.platformIds, ...creator.portfolio.map((p) => p.platformId).filter((x): x is number => x != null)]);
    const hit = uniq(campaign.platformIds).filter((id) => theirs.has(id));
    const s = hit.length / uniq(campaign.platformIds).length;
    factors.push({
      key: "platforms", label: FACTOR_LABELS.platforms, weight: WEIGHTS.platforms, score: s,
      detail: `Creates for ${hit.length} of ${uniq(campaign.platformIds).length} campaign platforms`,
      positive: s >= 0.99 ? `already creates for ${listNames(hit, names.platforms, 3, true)}` : undefined,
    });
  } else factors.push({ key: "platforms", label: FACTOR_LABELS.platforms, weight: WEIGHTS.platforms, score: null, detail: "No platforms in the brief" });

  // Budget compatibility — creator's lowest relevant price vs campaign max.
  const relevantPrices = creator.services
    .filter((s) => s.startingPriceCents != null && s.currency === campaign.currency && (wanted.length === 0 || (s.deliverableTypeId != null && wanted.includes(s.deliverableTypeId))))
    .map((s) => s.startingPriceCents!);
  const rate = relevantPrices.length ? Math.min(...relevantPrices) : creator.currency === campaign.currency ? creator.startingRateCents : null;
  if (campaign.budgetMaxCents != null && rate != null) {
    const ratio = rate / Math.max(campaign.budgetMaxCents, 1);
    const s = ratio <= 1 ? 1 : ratio <= 1.25 ? 0.5 : ratio <= 1.6 ? 0.2 : 0;
    factors.push({
      key: "budget", label: FACTOR_LABELS.budget, weight: WEIGHTS.budget, score: s,
      detail: ratio <= 1 ? "Starting price is within your budget" : `Starting price is ${Math.round((ratio - 1) * 100)}% above your maximum budget`,
      positive: ratio <= 1 ? "fits your stated budget" : undefined,
      caution: ratio > 1 ? "has a starting price above your budget" : undefined,
    });
  } else
    factors.push({
      key: "budget", label: FACTOR_LABELS.budget, weight: WEIGHTS.budget, score: null,
      detail: campaign.budgetMaxCents == null ? "No budget in the brief" : rate == null && creator.currency !== campaign.currency ? "Rates are in a different currency" : "Creator hasn't set rates",
    });

  // Availability vs deadline.
  {
    let s: number;
    let detail: string;
    if (creator.availability === "unavailable") {
      s = 0;
      detail = "Not taking new work right now";
    } else if (campaign.deadline && creator.availableFrom && creator.availableFrom > campaign.deadline) {
      s = 0;
      detail = "Available only after your deadline";
    } else if (campaign.deadline && creator.availableFrom && daysBetween(creator.availableFrom, campaign.deadline) < 7) {
      s = 0.4;
      detail = "Available less than a week before your deadline";
    } else if (creator.availability === "limited") {
      s = 0.6;
      detail = "Limited availability";
    } else {
      s = 1;
      detail = campaign.deadline && daysBetween(today, campaign.deadline) < 7 ? "Available, but your deadline is very close" : "Available before your deadline";
    }
    factors.push({
      key: "availability", label: FACTOR_LABELS.availability, weight: WEIGHTS.availability, score: s, detail,
      caution: s === 0 ? (creator.availability === "unavailable" ? "isn't taking new work right now" : "is only available after your deadline") : undefined,
    });
  }

  const scored = factors.filter((f) => f.score != null);
  const totalWeight = scored.reduce((sum, f) => sum + f.weight, 0);
  const raw = totalWeight ? scored.reduce((sum, f) => sum + f.weight * (f.score as number), 0) / totalWeight : 0;
  const score = Math.round(raw * 100);
  const coverage = totalWeight / Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const confidence = coverage >= 0.75 ? "high" : coverage >= 0.45 ? "medium" : "low";
  const tier = score >= 75 ? "strong" : score >= 55 ? "good" : score >= 35 ? "partial" : "weak";

  return { creatorId: creator.id, score, tier, confidence, factors, explanation: explain(tier, factors, confidence), algorithmVersion: ALGORITHM_VERSION };
}

const TIER_LEAD: Record<MatchResult["tier"], string> = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
  weak: "Weak match",
};

function joinPhrases(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// Evidence-backed factors lead the explanation; self-declared tags come after.
const EXPLANATION_PRIORITY: FactorKey[] = ["deliverables", "portfolio", "budget", "style", "skills", "platforms", "category", "availability"];

/** Plain-English explanation built only from factor data. */
export function explain(tier: MatchResult["tier"], factors: Factor[], confidence: MatchResult["confidence"]): string {
  const positives = factors
    .filter((f) => f.score != null && f.score >= 0.6 && f.positive)
    .sort((a, b) => EXPLANATION_PRIORITY.indexOf(a.key) - EXPLANATION_PRIORITY.indexOf(b.key))
    .slice(0, 3)
    .map((f) => f.positive!);
  const cautions = factors
    .filter((f) => f.caution)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 1)
    .map((f) => f.caution!);

  let text = positives.length
    ? `${TIER_LEAD[tier]} because this creator ${joinPhrases(positives)}.`
    : `${TIER_LEAD[tier]} — few of the brief's requirements are evidenced on this profile yet.`;
  if (cautions.length) text += ` Worth checking: this creator ${cautions[0]}.`;
  if (confidence === "low") text += " Low confidence: the brief or profile has limited information.";
  return text;
}

/** Creator-facing wording: why a campaign fits *you*, using neutral factor details. */
export function explainForCreator(result: MatchResult): string {
  const strong = result.factors
    .filter((f) => f.score != null && f.score >= 0.6)
    .sort((a, b) => EXPLANATION_PRIORITY.indexOf(a.key) - EXPLANATION_PRIORITY.indexOf(b.key))
    .slice(0, 3)
    .map((f) => f.detail.charAt(0).toLowerCase() + f.detail.slice(1));
  const weak = result.factors.filter((f) => f.score != null && f.score < 0.4).sort((a, b) => b.weight - a.weight)[0];
  let text = strong.length ? `${TIER_LEAD[result.tier]} for you: ${strong.join("; ")}.` : `${TIER_LEAD[result.tier]} — few of this brief's requirements show on your profile yet.`;
  if (weak) text += ` Gap: ${weak.label.toLowerCase()} — ${weak.detail.charAt(0).toLowerCase() + weak.detail.slice(1)}.`;
  return text;
}
