import type { Metadata } from "next";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/page-skeleton";
import Link from "next/link";
import { ArrowRight, Compass, Mail } from "lucide-react";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { MatchScore } from "@/components/matching/match-breakdown";
import { CompletenessCard, StatTile } from "@/components/dashboard/completeness-card";
import { GrowthMap } from "@/components/dashboard/growth-map";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getCreatorCompleteness } from "@/lib/data/creator-dashboard";
import { recommendCampaignsForCreator } from "@/lib/matching/service";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function CreatorDashboard({ searchParams }: PageProps<"/creator/dashboard">) {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const welcome = (await searchParams).welcome === "1";
  const [completeness, taxonomy, invitations, proposals, saved] = await Promise.all([
    getCreatorCompleteness(viewer.id),
    getTaxonomy(),
    supabase
      .from("campaign_invitations")
      .select("id, created_at, message, campaigns(id, title, brand_profiles(brand_name))")
      .eq("creator_id", viewer.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("proposals").select("status").eq("creator_id", viewer.id),
    supabase.from("saved_campaigns").select("campaign_id", { count: "exact", head: true }).eq("creator_id", viewer.id),
  ]);
  const p = proposals.data ?? [];
  const firstName = completeness.profile.display_name.split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow={welcome ? "Welcome to MAKERSIGNAL" : "Creator dashboard"}
        title={welcome ? `You're all set, ${firstName}.` : `Hello, ${firstName}`}
        description="Your opportunities, proposals and profile at a glance."
        actions={
          <Button asChild>
            <Link href="/explore/campaigns">
              <Compass aria-hidden /> Browse campaigns
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pending invitations" value={invitations.data?.length ?? 0} href="/creator/opportunities" />
        <StatTile label="Proposals in review" value={p.filter((x) => ["submitted", "under_review"].includes(x.status)).length} href="/creator/proposals" />
        <StatTile label="Accepted proposals" value={p.filter((x) => x.status === "accepted").length} href="/creator/projects" />
        <StatTile label="Saved campaigns" value={saved.count ?? 0} href="/creator/saved" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <Section title="Invitations" description="Brands that asked you for a proposal.">
            {invitations.data?.length ? (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {invitations.data.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Mail className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-medium">{i.campaigns?.title}</p>
                        <p className="text-xs text-ink-muted">
                          {i.campaigns?.brand_profiles?.brand_name} · {formatDate(i.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/campaigns/${i.campaigns?.id}`}>View brief</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No pending invitations" description="A complete profile with tagged portfolio pieces makes you easier to match." />
            )}
          </Section>

          <Section
            title="Recommended for you"
            description="Estimated fit between your Creative DNA and open briefs."
            actions={
              <Link href="/creator/opportunities" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                All opportunities <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          >
            <Suspense fallback={<SectionSkeleton rows={1} />}>
              <Recommended creatorId={viewer.id} taxonomy={taxonomy} />
            </Suspense>
          </Section>

          <Suspense fallback={<SectionSkeleton rows={1} />}>
            <GrowthMap creatorId={viewer.id} taxonomy={taxonomy} />
          </Suspense>
        </div>
        <aside className="space-y-4">
          <CompletenessCard percent={completeness.percent} items={completeness.items} />
          <p className="px-1 text-xs text-ink-muted">Completeness is a checklist of what brands and matching use. It doesn&apos;t guarantee work.</p>
        </aside>
      </div>
    </>
  );
}

async function Recommended({ creatorId, taxonomy }: { creatorId: string; taxonomy: Awaited<ReturnType<typeof getTaxonomy>> }) {
  const supabase = await createClient();
  const recommended = await recommendCampaignsForCreator(supabase, creatorId, taxonomy, 4);
  return (
    <>
      {recommended.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {recommended.map(({ campaign, match }) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    footer={
                      <div className="rounded-xl bg-secondary/60 p-3 text-xs">
                        <MatchScore score={match.score} tier={match.tier} />
                        <p className="mt-2 text-forest/85">{match.explanation}</p>
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Compass} title="No recommendations yet" description="Add Creative DNA tags and portfolio pieces so we can match you to open briefs." />
            )}
    </>
  );
}
