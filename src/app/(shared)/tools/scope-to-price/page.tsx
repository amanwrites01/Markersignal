import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ScopeTranslator, type ScopeDefaults } from "@/components/ai/scope-translator";
import { requireViewer } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getCampaignDetail } from "@/lib/data/campaigns";
import { getCreatorRates, getPricingConfig } from "@/lib/data/pricing";
import { aiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Scope-to-Price Translator" };

export default async function ScopeToPricePage({ searchParams }: PageProps<"/tools/scope-to-price">) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const campaignId = typeof params.campaign === "string" ? params.campaign : null;
  const creatorSlug = typeof params.creator === "string" ? params.creator : null;
  const [taxonomy, config] = await Promise.all([getTaxonomy(), getPricingConfig()]);

  let defaults: ScopeDefaults = { lines: [{ deliverableTypeId: null, quantity: 1 }], revisions: 2, timelineDays: 21, paidAds: false, usageMonths: 6, exclusivity: "none", rawFiles: false, budgetMin: "", budgetMax: "", currency: "USD" };
  let title: string | null = null;
  if (campaignId && /^[0-9a-f-]{36}$/.test(campaignId)) {
    const d = await getCampaignDetail(campaignId); // RLS: only campaigns the viewer can see
    if (d) {
      const c = d.campaign;
      title = c.title;
      defaults = {
        lines: d.deliverables.map((x) => ({ deliverableTypeId: x.deliverable_type_id, quantity: x.quantity })),
        revisions: c.revisions_expected,
        timelineDays: c.deadline ? Math.max(1, daysUntil(c.deadline) ?? 1) : null,
        paidAds: c.usage_paid_ads,
        usageMonths: c.usage_duration_months,
        exclusivity: c.exclusivity_required ? "category" : "none",
        rawFiles: c.raw_files_required,
        budgetMin: c.budget_min_cents != null ? String(c.budget_min_cents / 100) : "",
        budgetMax: c.budget_max_cents != null ? String(c.budget_max_cents / 100) : "",
        currency: c.currency,
      };
    }
  }

  let rates = null;
  if (viewer.profile.role === "creator") rates = await getCreatorRates(viewer.id);
  else if (creatorSlug) {
    const supabase = await createClient();
    const { data } = await supabase.from("creator_profiles").select("id").eq("slug", creatorSlug).maybeSingle();
    if (data) rates = await getCreatorRates(data.id);
  }

  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Scope-to-Price Translator"
        description={
          title
            ? `Pre-filled from “${title}”. Adjust the scope to see what drives cost.`
            : "See how deliverables, revisions, timing and usage rights affect an indicative price — before anyone negotiates."
        }
      />
      {rates ? (
        <p className="mb-4 text-sm text-ink-muted">
          Using {viewer.profile.role === "creator" ? "your" : `${rates.name}'s`} listed rates as the reference.
        </p>
      ) : null}
      <ScopeTranslator defaults={defaults} deliverableTypes={taxonomy.deliverableTypes} config={config} rates={rates} aiReady={aiConfigured()} />
    </>
  );
}
