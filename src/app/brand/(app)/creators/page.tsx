import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/page-header";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreatorFilterForm } from "@/components/discovery/filter-fields";
import { MobileFilters } from "@/components/discovery/mobile-filters";
import { Pagination } from "@/components/discovery/pagination";
import { CreatorResults } from "@/components/discovery/creator-results";
import { CREATOR_FILTER_KEYS, PER_PAGE, searchCreatorsFromParams } from "@/components/discovery/search";
import { activeFilterCount, str, type RawParams } from "@/components/discovery/params";
import { MatchList } from "@/components/matching/match-list";
import { RefreshMatchesButton } from "@/components/matching/refresh-matches-button";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Find creators" };

export default async function BrandCreatorsPage({ searchParams }: PageProps<"/brand/creators">) {
  const viewer = await requireRole("brand");
  const params = (await searchParams) as RawParams;
  const supabase = await createClient();
  const { data: myCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, status")
    .eq("brand_id", viewer.id)
    .in("status", ["draft", "published", "paused"])
    .order("updated_at", { ascending: false });
  const requested = str(params, "campaign");
  const campaign = (myCampaigns ?? []).find((c) => c.id === requested);

  const [taxonomy, result, invitable] = await Promise.all([getTaxonomy(), searchCreatorsFromParams(params), getInvitableCampaigns(viewer.id)]);
  const filters = activeFilterCount(params, CREATOR_FILTER_KEYS);

  return (
    <>
      <PageHeader eyebrow="Brand" title="Find creators" description="Search the marketplace, or rank creators against one of your campaigns with Creative DNA." />

      <form method="get" action="/brand/creators" className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="grid min-w-[240px] flex-1 gap-1.5">
          <Label htmlFor="campaign" className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Match against a campaign
          </Label>
          <NativeSelect id="campaign" name="campaign" defaultValue={campaign?.id ?? ""}>
            <option value="">No campaign — just search</option>
            {(myCampaigns ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.status === "draft" ? " (draft)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>

      {campaign ? (
        <Section
          className="mb-12"
          title={`Ranked for “${campaign.title}”`}
          description="Stored Creative DNA estimates for this campaign. Refresh after editing the brief."
          actions={
            <div className="flex gap-2">
              <RefreshMatchesButton campaignId={campaign.id} label="Refresh matches" />
              <Button asChild variant="ghost" size="sm">
                <Link href="/brand/creators">Clear</Link>
              </Button>
            </div>
          }
        >
          <MatchList campaignId={campaign.id} brandId={viewer.id} inviteCampaigns={invitable} limit={20} />
        </Section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-white p-5">
            <CreatorFilterForm params={params} taxonomy={taxonomy} action="/brand/creators" idPrefix="d" hidden={{ campaign: campaign?.id }} />
          </div>
        </aside>
        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm text-ink-muted" aria-live="polite">
              {result.total} creator{result.total === 1 ? "" : "s"}
              {filters ? ` · ${filters} filter${filters === 1 ? "" : "s"} applied` : ""}
            </h2>
            <MobileFilters count={filters}>
              <CreatorFilterForm params={params} taxonomy={taxonomy} action="/brand/creators" idPrefix="m" hidden={{ campaign: campaign?.id }} />
            </MobileFilters>
          </div>
          <CreatorResults rows={result.rows} failed={result.failed} />
          <Pagination basePath="/brand/creators" params={params} page={result.page} total={result.total} perPage={PER_PAGE} />
        </section>
      </div>
    </>
  );
}
