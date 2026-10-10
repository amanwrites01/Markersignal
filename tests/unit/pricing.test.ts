import { describe, expect, it } from "vitest";
import { analyseScope, type ScopeInput } from "@/lib/pricing/scope";

const base: ScopeInput = {
  lines: [{ deliverableTypeId: 1, name: "Short-form video", quantity: 3, effortUnits: 1 }],
  revisions: 2,
  timelineDays: 21,
  paidAds: false,
  usageMonths: 6,
  exclusivity: "none",
  rawFiles: false,
  budgetMinCents: null,
  budgetMaxCents: 300_000,
  currency: "USD",
};

describe("analyseScope", () => {
  it("uses platform defaults and a wide range when no creator rates exist", () => {
    const r = analyseScope(base);
    expect(r.rateSource).toBe("platform_default");
    expect(r.baseCents).toBe(90_000); // 3 × 1 unit × $300
    expect(r.drivers).toEqual([]);
    expect(r.lowCents).toBeLessThan(r.highCents);
    expect(r.disclaimer).toMatch(/rough guide/);
  });

  it("prefers the creator's own service price for that deliverable type", () => {
    const r = analyseScope({ ...base, rateByType: new Map([[1, 50_000]]) });
    expect(r.rateSource).toBe("creator_services");
    expect(r.baseCents).toBe(150_000);
  });

  it("adds each cost driver with an explanation", () => {
    const r = analyseScope({ ...base, paidAds: true, exclusivity: "category", rawFiles: true, revisions: 4, timelineDays: 5, usageMonths: 18 });
    expect(r.drivers.map((d) => d.key)).toEqual(["paid_ads", "usage_duration", "exclusivity", "raw_files", "revisions", "rush"]);
    // 30 + 20 (two extra 6-month blocks) + 25 + 20 + 16 + 25
    expect(r.totalUpliftPct).toBe(136);
    expect(r.drivers.every((d) => d.explanation.length > 10)).toBe(true);
  });

  it("flags a budget below the estimated range", () => {
    const r = analyseScope({ ...base, budgetMaxCents: 20_000 });
    expect(r.budgetComparison.status).toBe("below");
    expect(r.budgetComparison.message).toMatch(/below/);
  });

  it("lists missing requirements and asks clarifying questions", () => {
    const r = analyseScope({ ...base, revisions: null, timelineDays: null, usageMonths: null, budgetMaxCents: null });
    expect(r.missing).toHaveLength(4);
    expect(r.questions.some((q) => /revision/.test(q))).toBe(true);
    expect(r.budgetComparison.status).toBe("unknown");
  });

  it("never returns negative or non-integer cents", () => {
    const r = analyseScope({ ...base, lines: [] });
    expect(r.lowCents).toBe(0);
    expect(Number.isInteger(r.highCents)).toBe(true);
  });
});
