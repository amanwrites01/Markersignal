export type CompletenessItem = { key: string; label: string; done: boolean; weight: number; href: string };

export type CreatorCompletenessInput = {
  displayName?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarPath?: string | null;
  location?: string | null;
  categoryCount: number;
  skillCount: number;
  styleCount: number;
  platformCount: number;
  portfolioCount: number;
  serviceCount: number;
  startingRateCents?: number | null;
};

/** Transparent, rule-based checklist — the score is the share of weighted items done. */
export function creatorCompleteness(i: CreatorCompletenessInput) {
  const items: CompletenessItem[] = [
    { key: "basics", label: "Display name and headline", done: Boolean(i.displayName && i.headline), weight: 10, href: "/creator/profile" },
    { key: "bio", label: "Bio of at least 120 characters", done: (i.bio?.length ?? 0) >= 120, weight: 10, href: "/creator/profile" },
    { key: "avatar", label: "Profile photo", done: Boolean(i.avatarPath), weight: 10, href: "/creator/profile" },
    { key: "location", label: "Location", done: Boolean(i.location), weight: 5, href: "/creator/profile" },
    { key: "dna", label: "Categories, skills and creative style", done: i.categoryCount > 0 && i.skillCount > 0 && i.styleCount > 0, weight: 15, href: "/creator/profile#dna" },
    { key: "platforms", label: "Platforms you create for", done: i.platformCount > 0, weight: 5, href: "/creator/profile#dna" },
    { key: "portfolio", label: "At least 3 portfolio pieces", done: i.portfolioCount >= 3, weight: 25, href: "/creator/portfolio" },
    { key: "services", label: "At least one service with a price", done: i.serviceCount > 0, weight: 10, href: "/creator/profile#services" },
    { key: "rate", label: "Starting rate", done: i.startingRateCents != null, weight: 10, href: "/creator/profile#rates" },
  ];
  const total = items.reduce((s, x) => s + x.weight, 0);
  const done = items.filter((x) => x.done).reduce((s, x) => s + x.weight, 0);
  return { percent: Math.round((done / total) * 100), items };
}

export type BrandCompletenessInput = {
  brandName?: string | null;
  description?: string | null;
  logoPath?: string | null;
  website?: string | null;
  industryId?: number | null;
  linkCount: number;
  hasContact: boolean;
};

export function brandCompleteness(i: BrandCompletenessInput) {
  const items: CompletenessItem[] = [
    { key: "name", label: "Brand name and industry", done: Boolean(i.brandName && i.industryId), weight: 20, href: "/brand/settings" },
    { key: "description", label: "Brand description", done: (i.description?.length ?? 0) >= 80, weight: 25, href: "/brand/settings" },
    { key: "logo", label: "Logo", done: Boolean(i.logoPath), weight: 20, href: "/brand/settings" },
    { key: "website", label: "Website", done: Boolean(i.website), weight: 10, href: "/brand/settings" },
    { key: "links", label: "Social links", done: i.linkCount > 0, weight: 10, href: "/brand/settings" },
    { key: "contact", label: "Team contact details", done: i.hasContact, weight: 15, href: "/brand/settings" },
  ];
  const total = items.reduce((s, x) => s + x.weight, 0);
  const done = items.filter((x) => x.done).reduce((s, x) => s + x.weight, 0);
  return { percent: Math.round((done / total) * 100), items };
}
