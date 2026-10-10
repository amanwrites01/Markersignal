/**
 * Scope-to-Price Translator — deterministic baseline.
 *
 * Turns a requested scope into an indicative price range by applying the
 * platform's configured effort units and uplift factors to a reference rate.
 * Every figure is an ESTIMATE for discussion. It never changes a quote and is
 * not a market rate.
 */

export type PricingConfig = {
  multipliers: {
    paid_ads_usage: number;
    exclusivity_category: number;
    exclusivity_full: number;
    raw_files: number;
    extra_revision: number;
    rush_under_7_days: number;
    usage_per_extra_6_months: number;
  };
  defaultUnitCents: number;
};

export const DEFAULT_PRICING: PricingConfig = {
  multipliers: {
    paid_ads_usage: 0.3,
    exclusivity_category: 0.25,
    exclusivity_full: 0.5,
    raw_files: 0.2,
    extra_revision: 0.08,
    rush_under_7_days: 0.25,
    usage_per_extra_6_months: 0.1,
  },
  defaultUnitCents: 30_000,
};

export type ScopeLine = { deliverableTypeId: number | null; name: string; quantity: number; effortUnits: number };

export type ScopeInput = {
  lines: ScopeLine[];
  revisions: number | null; // requested revision rounds
  includedRevisions?: number; // rounds normally included in a base price
  timelineDays: number | null;
  paidAds: boolean;
  usageMonths: number | null;
  exclusivity: "none" | "category" | "full";
  rawFiles: boolean;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  currency: string;
  /** Creator's price per deliverable type (same currency), if known. */
  rateByType?: Map<number, number>;
  /** Creator's general starting rate per effort unit (same currency), if known. */
  baseRateCents?: number | null;
};

export type CostDriver = { key: string; label: string; upliftPct: number; explanation: string };

export type ScopeAnalysis = {
  rateSource: "creator_services" | "creator_starting_rate" | "platform_default";
  baseCents: number;
  lowCents: number;
  highCents: number;
  drivers: CostDriver[];
  totalUpliftPct: number;
  budgetComparison: { status: "within" | "below" | "above" | "unknown"; message: string };
  missing: string[];
  questions: string[];
  summary: string[];
  disclaimer: string;
};

const round = (cents: number) => Math.round(cents / 500) * 500; // to the nearest 5 currency units

export function analyseScope(input: ScopeInput, config: PricingConfig = DEFAULT_PRICING): ScopeAnalysis {
  const m = config.multipliers;
  const lines = input.lines.filter((l) => l.quantity > 0);

  // 1) Base cost from the best available reference rate.
  let rateSource: ScopeAnalysis["rateSource"] = "platform_default";
  let baseCents = 0;
  for (const l of lines) {
    const typed = l.deliverableTypeId != null ? input.rateByType?.get(l.deliverableTypeId) : undefined;
    if (typed != null) {
      baseCents += typed * l.quantity;
      rateSource = "creator_services";
    } else if (input.baseRateCents != null) {
      baseCents += input.baseRateCents * l.effortUnits * l.quantity;
      if (rateSource !== "creator_services") rateSource = "creator_starting_rate";
    } else {
      baseCents += config.defaultUnitCents * l.effortUnits * l.quantity;
    }
  }

  // 2) Cost drivers (each an uplift on the base).
  const drivers: CostDriver[] = [];
  if (input.paidAds) {
    drivers.push({ key: "paid_ads", label: "Paid advertising usage", upliftPct: m.paid_ads_usage * 100, explanation: "Running content as ads extends its commercial value beyond organic posting." });
  }
  if (input.usageMonths != null && input.usageMonths > 6) {
    const blocks = Math.ceil((input.usageMonths - 6) / 6);
    drivers.push({ key: "usage_duration", label: `Usage for ${input.usageMonths} months`, upliftPct: blocks * m.usage_per_extra_6_months * 100, explanation: "Longer licence periods are usually priced higher than a standard 6-month window." });
  }
  if (input.exclusivity !== "none") {
    const pct = (input.exclusivity === "full" ? m.exclusivity_full : m.exclusivity_category) * 100;
    drivers.push({ key: "exclusivity", label: input.exclusivity === "full" ? "Full exclusivity" : "Category exclusivity", upliftPct: pct, explanation: "Exclusivity stops the creator taking competing work for the period." });
  }
  if (input.rawFiles) {
    drivers.push({ key: "raw_files", label: "Raw / source files", upliftPct: m.raw_files * 100, explanation: "Handing over raw footage or source files lets you re-edit and reuse the work." });
  }
  const included = input.includedRevisions ?? 2;
  if (input.revisions != null && input.revisions > included) {
    const extra = input.revisions - included;
    drivers.push({ key: "revisions", label: `${extra} extra revision round${extra === 1 ? "" : "s"}`, upliftPct: extra * m.extra_revision * 100, explanation: `Base prices typically include ${included} rounds of revisions.` });
  }
  if (input.timelineDays != null && input.timelineDays < 7) {
    drivers.push({ key: "rush", label: "Rush timeline (under 7 days)", upliftPct: m.rush_under_7_days * 100, explanation: "Short deadlines may require rescheduling other work." });
  }

  const totalUpliftPct = Math.round(drivers.reduce((s, d) => s + d.upliftPct, 0));
  const mid = baseCents * (1 + totalUpliftPct / 100);
  // Wider range when we're using platform defaults rather than the creator's own rates.
  const spread = rateSource === "platform_default" ? 0.35 : rateSource === "creator_starting_rate" ? 0.2 : 0.1;
  const lowCents = round(mid * (1 - spread));
  const highCents = round(mid * (1 + spread));

  // 3) Missing requirements.
  const missing: string[] = [];
  if (!lines.length) missing.push("No deliverables listed — add type and quantity for each piece of content.");
  if (input.timelineDays == null) missing.push("No deadline or timeline.");
  if (input.revisions == null) missing.push("Number of revision rounds isn't specified.");
  if (input.usageMonths == null) missing.push("Usage duration isn't specified.");
  if (input.budgetMaxCents == null) missing.push("No budget given.");

  // 4) Budget comparison.
  let budgetComparison: ScopeAnalysis["budgetComparison"] = { status: "unknown", message: "Add a budget to compare it with the estimate." };
  if (input.budgetMaxCents != null && lines.length) {
    if (input.budgetMaxCents < lowCents) {
      const gap = Math.round(((lowCents - input.budgetMaxCents) / lowCents) * 100);
      budgetComparison = { status: "below", message: `The budget is about ${gap}% below the low end of the estimated range. Consider reducing scope or usage, or raising the budget.` };
    } else if (input.budgetMinCents != null && input.budgetMinCents > highCents) {
      budgetComparison = { status: "above", message: "The budget is above the estimated range — there may be room to add deliverables or usage." };
    } else {
      budgetComparison = { status: "within", message: "The budget overlaps the estimated range." };
    }
  }

  // 5) Questions for negotiation.
  const questions: string[] = [];
  if (input.paidAds) questions.push("Which ad platforms, for how long, and will the creator's handle be used (whitelisting)?");
  if (input.exclusivity !== "none") questions.push("Which competitors or categories are excluded, and for exactly how long?");
  if (input.rawFiles) questions.push("Which raw files are needed (all footage, selects, project files) and in what format?");
  if (input.usageMonths == null || input.usageMonths > 12) questions.push("Can usage start with a shorter period and be extended later at an agreed price?");
  if (input.revisions == null) questions.push("How many revision rounds are included, and what counts as a revision?");
  questions.push("What does 'approved' mean for each deliverable, and who signs off?");

  const summary = [
    `${lines.reduce((s, l) => s + l.quantity, 0)} deliverable${lines.length === 1 && lines[0]!.quantity === 1 ? "" : "s"}: ${lines.map((l) => `${l.quantity} × ${l.name}`).join(", ") || "none listed"}.`,
    input.timelineDays != null ? `Timeline: ${input.timelineDays} days.` : "Timeline: not set.",
    `Usage: ${input.paidAds ? "organic + paid ads" : "organic"}${input.usageMonths ? `, ${input.usageMonths} months` : ""}${input.exclusivity !== "none" ? `, ${input.exclusivity} exclusivity` : ""}${input.rawFiles ? ", raw files included" : ""}.`,
  ];

  return {
    rateSource,
    baseCents: round(baseCents),
    lowCents,
    highCents,
    drivers,
    totalUpliftPct,
    budgetComparison,
    missing,
    questions,
    summary,
    disclaimer:
      rateSource === "creator_services"
        ? "Estimate based on this creator's listed service prices and platform uplift factors. Not a quote or a market rate."
        : rateSource === "creator_starting_rate"
          ? "Estimate based on this creator's starting rate and platform effort/uplift factors. Not a quote or a market rate."
          : "Estimate based on platform default effort factors because no creator rates were available. Treat it as a rough guide only.",
  };
}
