import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/pricing/scope";

/** Platform pricing configuration (platform_settings), falling back to defaults. */
export async function getPricingConfig(): Promise<PricingConfig> {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value").in("key", ["pricing.multipliers", "pricing.default_unit_cents"]);
  const m = data?.find((r) => r.key === "pricing.multipliers")?.value as Partial<PricingConfig["multipliers"]> | undefined;
  const unit = Number(data?.find((r) => r.key === "pricing.default_unit_cents")?.value);
  return {
    multipliers: { ...DEFAULT_PRICING.multipliers, ...(m ?? {}) },
    defaultUnitCents: Number.isFinite(unit) && unit > 0 ? unit : DEFAULT_PRICING.defaultUnitCents,
  };
}

/** A creator's reference rates (only visible creators, via RLS). */
export async function getCreatorRates(creatorId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: services }] = await Promise.all([
    supabase.from("creator_profiles").select("display_name, starting_rate_cents, currency").eq("id", creatorId).maybeSingle(),
    supabase.from("creator_services").select("deliverable_type_id, starting_price_cents, currency").eq("creator_id", creatorId).eq("active", true),
  ]);
  if (!profile) return null;
  const byType: [number, number][] = [];
  for (const s of services ?? []) {
    if (s.deliverable_type_id != null && s.starting_price_cents != null && s.currency === profile.currency) {
      const prev = byType.find(([t]) => t === s.deliverable_type_id);
      if (!prev || s.starting_price_cents < prev[1]) {
        if (prev) prev[1] = s.starting_price_cents;
        else byType.push([s.deliverable_type_id, s.starting_price_cents]);
      }
    }
  }
  return { name: profile.display_name, currency: profile.currency, baseRateCents: profile.starting_rate_cents, rateByType: byType };
}
