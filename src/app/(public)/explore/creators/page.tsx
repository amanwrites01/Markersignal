import type { Metadata } from "next";
import { CreatorFilterForm } from "@/components/discovery/filter-fields";
import { MobileFilters } from "@/components/discovery/mobile-filters";
import { Pagination } from "@/components/discovery/pagination";
import { CreatorResults } from "@/components/discovery/creator-results";
import { CREATOR_FILTER_KEYS, PER_PAGE, searchCreatorsFromParams } from "@/components/discovery/search";
import { activeFilterCount, type RawParams } from "@/components/discovery/params";
import { getTaxonomy } from "@/lib/data/taxonomy";

export const metadata: Metadata = {
  title: "Explore creators",
  description: "Search creators by name, niche, skill, creative style, platform and budget.",
};

export default async function ExploreCreatorsPage({ searchParams }: PageProps<"/explore/creators">) {
  const params = (await searchParams) as RawParams;
  const [taxonomy, result] = await Promise.all([getTaxonomy(), searchCreatorsFromParams(params)]);
  const filters = activeFilterCount(params, CREATOR_FILTER_KEYS);

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8">
        <p className="eyebrow">Explore</p>
        <h1 className="h-page mt-2 sm:text-4xl">Find creators</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">Search by skill, Creative DNA, platform and budget. Only public profiles appear here.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-white p-5">
            <CreatorFilterForm params={params} taxonomy={taxonomy} action="/explore/creators" idPrefix="d" />
          </div>
        </aside>
        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm text-ink-muted" aria-live="polite">
              {result.total} creator{result.total === 1 ? "" : "s"}
              {filters ? ` · ${filters} filter${filters === 1 ? "" : "s"} applied` : ""}
            </h2>
            <MobileFilters count={filters}>
              <CreatorFilterForm params={params} taxonomy={taxonomy} action="/explore/creators" idPrefix="m" />
            </MobileFilters>
          </div>
          <CreatorResults rows={result.rows} failed={result.failed} />
          <Pagination basePath="/explore/creators" params={params} page={result.page} total={result.total} perPage={PER_PAGE} />
        </section>
      </div>
    </div>
  );
}
