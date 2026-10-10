import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, ExternalLink, Inbox, UsersRound } from "lucide-react";
import { BriefReviewButton } from "@/components/ai/brief-review";
import { aiConfigured } from "@/lib/ai/client";
import { PageHeader, Panel, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CampaignSummary } from "@/components/marketplace/campaign-summary";
import { CampaignStatusActions } from "@/components/brand/campaign-status-actions";
import { InvitationList } from "@/components/brand/invitation-list";
import { MatchList } from "@/components/matching/match-list";
import { RefreshMatchesButton } from "@/components/matching/refresh-matches-button";
import { requireRole } from "@/lib/auth/session";
import { getCampaignDetail } from "@/lib/data/campaigns";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Campaign" };

export default async function BrandCampaignPage({ params }: PageProps<"/brand/campaigns/[id]">) {
  const viewer = await requireRole("brand");
  const { id } = await params;
  const detail = await getCampaignDetail(id);
  if (!detail || detail.campaign.brand_id !== viewer.id) notFound();
  const c = detail.campaign;
  const supabase = await createClient();
  const [invitations, proposalCounts, inviteCampaigns, lastMatch] = await Promise.all([
    supabase
      .from("campaign_invitations")
      .select("id, status, created_at, responded_at, creator_id, squad_role_id, creator_profiles(display_name, slug)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("brand_list_proposals", { p_campaign_id: id }),
    getInvitableCampaigns(viewer.id),
    supabase.from("match_results").select("computed_at").eq("campaign_id", id).is("squad_role_id", null).order("computed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const proposals = proposalCounts.data ?? [];
  const open = proposals.filter((p) => ["submitted", "under_review"].includes(p.status)).length;
  const canInvite = ["published", "paused"].includes(c.status);

  return (
    <>
      <PageHeader
        eyebrow="Campaign"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.title} <StatusBadge status={c.status} />
          </span>
        }
        description={c.published_at ? `Published ${formatDate(c.published_at)}` : "Not published yet — only you can see it."}
        actions={<CampaignStatusActions id={c.id} status={c.status} />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href={`/brand/proposals?campaign=${c.id}`} className="group rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
          <p className="meta flex items-center gap-1.5">
            <Inbox className="size-4" aria-hidden /> Proposals to review
          </p>
          <p className="mt-2 text-3xl font-semibold">{open}</p>
          <p className="mt-1 text-xs text-ink-muted">{proposals.length} received in total</p>
        </Link>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="meta">Invitations</p>
          <p className="mt-2 text-3xl font-semibold">{invitations.data?.filter((i) => i.status === "pending").length ?? 0}</p>
          <p className="mt-1 text-xs text-ink-muted">pending · {invitations.data?.filter((i) => i.status === "accepted").length ?? 0} accepted</p>
        </div>
        <Link href={`/brand/campaigns/${c.id}/squad`} className="group rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
          <p className="meta flex items-center gap-1.5">
            <UsersRound className="size-4" aria-hidden /> Squad Builder
          </p>
          <p className="mt-2 text-sm">Plan multiple creator roles for this campaign.</p>
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
            Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </p>
        </Link>
      </div>

      <div className="grid gap-10">
        <Section
          title="Recommended creators"
          description={
            lastMatch.data
              ? `Creative DNA estimates · last run ${formatDate(lastMatch.data.computed_at)}. Refresh after editing the brief.`
              : "Creative DNA ranks creators by skills, style, portfolio evidence, platforms, budget and availability."
          }
          actions={<RefreshMatchesButton campaignId={c.id} label={lastMatch.data ? "Refresh" : "Find matches"} />}
        >
          {!canInvite && c.status === "draft" ? (
            <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">You can review matches now. Publish the campaign to invite creators.</p>
          ) : null}
          <MatchList
            campaignId={c.id}
            brandId={viewer.id}
            inviteCampaigns={canInvite ? inviteCampaigns : []}
            invitedIds={(invitations.data ?? []).filter((i) => ["pending", "accepted"].includes(i.status)).map((i) => i.creator_id)}
          />
        </Section>

        <Section title="Invitations">
          <InvitationList invitations={invitations.data ?? []} />
        </Section>

        <Panel>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="h-section">Brief</h2>
            <div className="flex flex-wrap gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tools/scope-to-price?campaign=${c.id}`}>
                  <Calculator aria-hidden /> Scope-to-Price
                </Link>
              </Button>
              <BriefReviewButton campaignId={c.id} aiReady={aiConfigured()} />
            </div>
            {c.status !== "draft" ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/campaigns/${c.id}`} target="_blank">
                  View as creators see it <ExternalLink aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
          <CampaignSummary detail={detail} />
        </Panel>
      </div>
    </>
  );
}
