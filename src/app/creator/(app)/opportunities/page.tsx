import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { MatchScore } from "@/components/matching/match-breakdown";
import { InvitationActions } from "@/components/discovery/invitation-actions";
import { SaveCampaignButton } from "@/components/discovery/save-campaign-button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { recommendCampaignsForCreator } from "@/lib/matching/service";
import { formatBudget, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({ searchParams }: PageProps<"/creator/opportunities">) {
  const viewer = await requireRole("creator");
  const tab = (await searchParams).tab === "invitations" ? "invitations" : "recommended";
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("campaign_invitations")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", viewer.id)
    .eq("status", "pending");

  const tabs = [
    { key: "recommended", label: "Recommended" },
    { key: "invitations", label: `Invitations${pendingCount ? ` (${pendingCount})` : ""}` },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Creator"
        title="Opportunities"
        description="Briefs that fit your Creative DNA, and invitations from brands."
        actions={
          <Button asChild variant="outline">
            <Link href="/explore/campaigns">
              <Compass aria-hidden /> Browse all campaigns
            </Link>
          </Button>
        }
      />
      <nav aria-label="Opportunity type" className="mb-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/creator/opportunities${t.key === "recommended" ? "" : "?tab=invitations"}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm", t.key === tab ? "border-forest font-medium" : "border-transparent text-ink-muted hover:text-forest")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "recommended" ? <Recommended userId={viewer.id} /> : <Invitations userId={viewer.id} />}
    </>
  );
}

async function Recommended({ userId }: { userId: string }) {
  const supabase = await createClient();
  const recommended = await recommendCampaignsForCreator(supabase, userId, await getTaxonomy(), 12);
  if (!recommended.length) {
    return (
      <EmptyState
        icon={Compass}
        title="No recommendations right now"
        description="We only recommend open briefs with a reasonable fit. Add Creative DNA tags, services and tagged portfolio pieces to improve matching."
        action={
          <Button asChild variant="outline">
            <Link href="/creator/profile#dna">Update Creative DNA</Link>
          </Button>
        }
      />
    );
  }
  const { data: saved } = await supabase.from("saved_campaigns").select("campaign_id").eq("creator_id", userId);
  const savedIds = new Set((saved ?? []).map((s) => s.campaign_id));
  return (
    <>
      <p className="meta mb-5">Fit estimates from your profile and each brief. They don&apos;t predict whether a brand will choose you.</p>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {recommended.map(({ campaign, match }) => (
          <li key={campaign.id}>
            <CampaignCard
              campaign={campaign}
              footer={
                <div className="grid gap-3">
                  <div className="rounded-xl bg-secondary/60 p-3 text-xs">
                    <MatchScore score={match.score} tier={match.tier} />
                    <p className="mt-2 text-forest/85">{match.explanation}</p>
                  </div>
                  <SaveCampaignButton campaignId={campaign.id} saved={savedIds.has(campaign.id)} />
                </div>
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}

async function Invitations({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("campaign_invitations")
    .select("id, status, message, created_at, responded_at, campaigns(id, title, status, deadline, budget_min_cents, budget_max_cents, currency, brand_profiles(brand_name))")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });
  if (!invitations?.length) {
    return <EmptyState icon={Mail} title="No invitations yet" description="When a brand invites you to a campaign, it appears here." />;
  }
  return (
    <ul className="grid gap-4">
      {invitations.map((i) => {
        const c = i.campaigns;
        return (
          <li key={i.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-ink-muted">
                  {c?.brand_profiles?.brand_name} · invited {formatDate(i.created_at)}
                </p>
                <p className="mt-1 font-semibold">{c?.title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {formatBudget(c?.budget_min_cents ?? null, c?.budget_max_cents ?? null, c?.currency)} · Deadline {formatDate(c?.deadline)}
                </p>
              </div>
              <StatusBadge status={i.status} />
            </div>
            {i.message ? <blockquote className="mt-3 border-l-2 border-lime pl-3 text-sm whitespace-pre-line text-forest/85">{i.message}</blockquote> : null}
            <div className="mt-4">
              {i.status === "pending" && c && c.status === "published" ? (
                <InvitationActions invitationId={i.id} campaignId={c.id} />
              ) : i.status === "pending" ? (
                <p className="text-sm text-ink-muted">This campaign isn&apos;t accepting proposals right now.</p>
              ) : c ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/campaigns/${c.id}`}>View brief</Link>
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
