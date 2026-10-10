import { describe, expect, it } from "vitest";
import { scoreMatch, WEIGHTS, type MatchCampaign, type MatchCreator, type MatchNames } from "@/lib/matching/score";

const names: MatchNames = {
  skills: new Map([[1, "Short-form editing"], [2, "Product photography"], [3, "Colour grading"]]),
  styles: new Map([[10, "Minimalist"], [11, "Cinematic"], [12, "Playful"]]),
  deliverableTypes: new Map([[20, "Short-form video"], [21, "Photo set"]]),
  industries: new Map([[30, "Beauty & skincare"], [31, "Gaming"]]),
  categories: new Map([[40, "Video creator"], [41, "Photographer"]]),
  platforms: new Map([[50, "Instagram"], [51, "TikTok"]]),
};

const campaign: MatchCampaign = {
  categoryId: 40,
  industryId: 30,
  styleIds: [10, 11],
  skillIds: [1, 3],
  platformIds: [50, 51],
  deliverableTypeIds: [20],
  budgetMaxCents: 200_000,
  currency: "USD",
  deadline: "2030-06-30",
};

const ideal: MatchCreator = {
  id: "ideal",
  categoryIds: [40],
  styleIds: [10, 11],
  skillIds: [1, 3],
  platformIds: [50, 51],
  availability: "available",
  availableFrom: null,
  startingRateCents: 80_000,
  currency: "USD",
  portfolio: [
    { deliverableTypeId: 20, categoryId: 40, industryId: 30, platformId: 51 },
    { deliverableTypeId: 20, categoryId: 40, industryId: 30, platformId: 50 },
    { deliverableTypeId: 20, categoryId: 40, industryId: 30, platformId: 50 },
  ],
  services: [{ deliverableTypeId: 20, startingPriceCents: 90_000, currency: "USD" }],
};

const TODAY = "2030-01-01";

describe("scoreMatch", () => {
  it("gives a near-perfect score and a strong, specific explanation to an ideal fit", () => {
    const r = scoreMatch(campaign, ideal, names, TODAY);
    expect(r.score).toBe(100);
    expect(r.tier).toBe("strong");
    expect(r.confidence).toBe("high");
    expect(r.explanation).toMatch(/^Strong match because this creator/);
    expect(r.explanation).toContain("short-form video");
    expect(r.explanation).toContain("beauty & skincare portfolio work");
  });

  it("weights sum to 100 so scores are on a 0–100 scale", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("scores a creator with no overlap low and says why", () => {
    const r = scoreMatch(campaign, { ...ideal, id: "x", categoryIds: [41], styleIds: [12], skillIds: [2], platformIds: [], portfolio: [], services: [], startingRateCents: 900_000 }, names, TODAY);
    expect(r.score).toBeLessThan(25);
    expect(r.tier).toBe("weak");
    expect(r.explanation).toContain("Worth checking");
  });

  it("excludes factors with no data instead of penalising (renormalisation)", () => {
    const sparse: MatchCampaign = { ...campaign, skillIds: [], styleIds: [], platformIds: [], categoryId: null, industryId: null };
    const r = scoreMatch(sparse, ideal, names, TODAY);
    expect(r.factors.find((f) => f.key === "skills")!.score).toBeNull();
    expect(r.score).toBe(100);
    expect(r.confidence).toBe("low");
    expect(r.explanation).toContain("Low confidence");
  });

  it("applies budget bands: within, slightly over, far over", () => {
    const at = (rate: number) =>
      scoreMatch(campaign, { ...ideal, services: [], startingRateCents: rate }, names, TODAY).factors.find((f) => f.key === "budget")!.score;
    expect(at(200_000)).toBe(1);
    expect(at(240_000)).toBe(0.5);
    expect(at(300_000)).toBe(0.2);
    expect(at(500_000)).toBe(0);
  });

  it("prefers the creator's relevant service price over the general starting rate", () => {
    const r = scoreMatch(campaign, { ...ideal, startingRateCents: 900_000, services: [{ deliverableTypeId: 20, startingPriceCents: 150_000, currency: "USD" }] }, names, TODAY);
    expect(r.factors.find((f) => f.key === "budget")!.score).toBe(1);
  });

  it("does not compare prices across currencies", () => {
    const r = scoreMatch(campaign, { ...ideal, currency: "EUR", services: [{ deliverableTypeId: 20, startingPriceCents: 1, currency: "EUR" }] }, names, TODAY);
    const budget = r.factors.find((f) => f.key === "budget")!;
    expect(budget.score).toBeNull();
    expect(budget.detail).toMatch(/currency/);
  });

  it("treats unavailability and availability after the deadline as zero availability", () => {
    expect(scoreMatch(campaign, { ...ideal, availability: "unavailable" }, names, TODAY).factors.find((f) => f.key === "availability")!.score).toBe(0);
    expect(scoreMatch(campaign, { ...ideal, availableFrom: "2030-07-15" }, names, TODAY).factors.find((f) => f.key === "availability")!.score).toBe(0);
    expect(scoreMatch(campaign, { ...ideal, availability: "limited" }, names, TODAY).factors.find((f) => f.key === "availability")!.score).toBe(0.6);
  });

  it("counts portfolio and services as deliverable evidence", () => {
    const viaService = scoreMatch(campaign, { ...ideal, portfolio: [], services: [{ deliverableTypeId: 20, startingPriceCents: 100, currency: "USD" }] }, names, TODAY);
    expect(viaService.factors.find((f) => f.key === "deliverables")!.score).toBe(1);
  });

  it("is deterministic", () => {
    expect(scoreMatch(campaign, ideal, names, TODAY)).toEqual(scoreMatch(campaign, ideal, names, TODAY));
  });

  it("has no inputs for sensitive attributes", () => {
    // Extra fields on the creator object must not change the result.
    const withExtras = { ...ideal, age: 22, gender: "x", ethnicity: "y", followers: 1_000_000, location: "Anywhere" } as MatchCreator;
    expect(scoreMatch(campaign, withExtras, names, TODAY).score).toBe(scoreMatch(campaign, ideal, names, TODAY).score);
  });
});

describe("explainForCreator", () => {
  it("speaks to the creator in the second person using factor details", async () => {
    const { explainForCreator } = await import("@/lib/matching/score");
    const text = explainForCreator(scoreMatch(campaign, { ...ideal, availability: "limited", skillIds: [] }, names, TODAY));
    expect(text).toMatch(/for you: /);
    expect(text).not.toMatch(/this creator/);
    expect(text).toContain("Gap: relevant skills");
  });
});
