import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { CampaignFilterForm } from "@/components/discovery/filter-fields";
import { MobileFilters } from "@/components/discovery/mobile-filters";
import { Pagination } from "@/components/discovery/pagination";
import { SaveCampaignButton } from "@/components/discovery/save-campaign-button";
import { CAMPAIGN_FILTER_KEYS, PER_PAGE, searchCampaignsFromParams } from "@/components/discovery/search";
import { activeFilterCount, type RawParams } from "@/components/discovery/params";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { EmptyState } from "@/components/empty-state";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Explore campaigns",
  description: "Browse open brand campaigns by platform, deliverable, budget and deadline.",
};

export default async function ExploreCampaignsPage({ searchParams }: PageProps<"/explore/campaigns">) {
  const params = (await searchParams) as RawParams;
  const [taxonomy, result, viewer] = await Promise.all([getTaxonomy(), searchCampaignsFromParams(params), getViewer()]);
  const filters = activeFilterCount(params, CAMPAIGN_FILTER_KEYS);
  const isCreator = viewer?.profile.role === "creator";
  let saved = new Set<string>();
  if (isCreator && result.rows.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("saved_campaigns").select("campaign_id").eq("creator_id", viewer!.id).in("campaign_id", result.rows.map((r) => r.id));
    saved = new Set((data ?? []).map((d) => d.campaign_id));
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <p className="eyebrow">Explore</p>
        <h1 className="h-page mt-2 sm:text-4xl">Find opportunities</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">Open briefs from brands, with budgets, deliverables and usage-rights expectations stated up front.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-white p-5">
            <CampaignFilterForm params={params} taxonomy={taxonomy} action="/explore/campaigns" idPrefix="d" />
          </div>
        </aside>
        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm text-ink-muted" aria-live="polite">
              {result.total} open campaign{result.total === 1 ? "" : "s"}
              {filters ? ` · ${filters} filter${filters === 1 ? "" : "s"} applied` : ""}
            </h2>
            <MobileFilters count={filters}>
              <CampaignFilterForm params={params} taxonomy={taxonomy} action="/explore/campaigns" idPrefix="m" />
            </MobileFilters>
          </div>
          {result.rows.length ? (
            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {result.rows.map((c) => (
                <li key={c.id}>
                  <CampaignCard campaign={c} footer={isCreator ? <SaveCampaignButton campaignId={c.id} saved={saved.has(c.id)} /> : undefined} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={SearchX}
              title={result.failed ? "Search is unavailable right now" : "No open campaigns match these filters"}
              description={result.failed ? "Please try again in a moment." : "Try removing a filter or widening the deadline."}
            />
          )}
          <Pagination basePath="/explore/campaigns" params={params} page={result.page} total={result.total} perPage={PER_PAGE} />
        </section>
      </div>
    </div>
  );
}
