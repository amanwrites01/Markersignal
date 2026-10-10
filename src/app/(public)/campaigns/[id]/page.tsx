import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Send, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CampaignSummary } from "@/components/marketplace/campaign-summary";
import { ReportButton } from "@/components/marketplace/report-button";
import { SaveCampaignButton } from "@/components/proposals/save-campaign-button";
import { getViewer } from "@/lib/auth/session";
import { getCampaignDetail } from "@/lib/data/campaigns";
import { campaignAcceptsProposals } from "@/lib/data/proposals";
import { createClient } from "@/lib/supabase/server";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/campaigns/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Campaign not found" };
  const detail = await getCampaignDetail(id);
  return detail ? { title: detail.campaign.title, description: detail.campaign.objective ?? undefined } : { title: "Campaign not found" };
}

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getCampaignDetail(id);
  // RLS hides drafts, invite-only and members-only campaigns from viewers who can't see them.
  if (!detail) notFound();
  const c = detail.campaign;
  const brand = c.brand_profiles;
  const viewer = await getViewer();
  const isOwner = viewer?.id === c.brand_id;
  const isCreator = viewer?.profile.role === "creator";
  const accepts = campaignAcceptsProposals(c);

  let proposal: { id: string; status: string } | null = null;
  let saved = false;
  let invited = false;
  if (isCreator) {
    const supabase = await createClient();
    const [p, s, i] = await Promise.all([
      supabase.from("proposals").select("id, status").eq("campaign_id", c.id).eq("creator_id", viewer!.id).maybeSingle(),
      supabase.from("saved_campaigns").select("campaign_id").eq("campaign_id", c.id).eq("creator_id", viewer!.id).maybeSingle(),
      supabase.from("campaign_invitations").select("status").eq("campaign_id", c.id).eq("creator_id", viewer!.id).maybeSingle(),
    ]);
    proposal = p.data;
    saved = Boolean(s.data);
    invited = i.data?.status === "pending" || i.data?.status === "accepted";
  }
  const logo = publicFileUrl("brand-logos", brand?.logo_path);

  return (
    <div className="pb-20">
      <section className="border-b border-line bg-white">
        <div className="container-page py-10 sm:py-14">
          <div className="flex items-center gap-3">
            <span className="relative grid size-11 place-items-center overflow-hidden rounded-xl bg-forest font-semibold text-lime">
              {logo ? <Image src={logo} alt="" fill sizes="44px" className="object-cover" /> : brand?.brand_name.charAt(0)}
            </span>
            <div>
              <p className="font-medium">{brand?.brand_name}</p>
              <p className="text-xs text-ink-muted">
                {[c.industries?.name, c.published_at ? `Posted ${formatDate(c.published_at)}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{c.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={c.status} />
                {invited ? <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-medium text-forest">You&apos;re invited</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isOwner ? (
                <Button asChild>
                  <Link href={`/brand/campaigns/${c.id}`}>
                    <Settings2 aria-hidden /> Manage campaign
                  </Link>
                </Button>
              ) : isCreator ? (
                <>
                  <SaveCampaignButton campaignId={c.id} saved={saved} />
                  {proposal ? (
                    <Button asChild>
                      <Link href={`/creator/proposals/${proposal.id}`}>{proposal.status === "draft" ? "Continue draft" : "View your proposal"}</Link>
                    </Button>
                  ) : accepts.open ? (
                    <Button asChild>
                      <Link href={`/creator/proposals/new?campaign=${c.id}`}>
                        <Send aria-hidden /> Send proposal
                      </Link>
                    </Button>
                  ) : (
                    <span className="rounded-full bg-secondary px-3 py-2 text-sm text-ink-muted">{accepts.reason}</span>
                  )}
                </>
              ) : !viewer ? (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/auth/login?next=/campaigns/${c.id}`}>Log in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth/sign-up">Join as a creator to apply</Link>
                  </Button>
                </>
              ) : viewer.profile.role === "brand" ? (
                <span className="text-sm text-ink-muted">Only creators can send proposals.</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page mt-10">
        <CampaignSummary detail={detail} />
        {brand?.description ? (
          <section className="mt-12 max-w-3xl">
            <h2 className="h-section">About {brand.brand_name}</h2>
            <p className="prose-body mt-2 whitespace-pre-line">{brand.description}</p>
          </section>
        ) : null}
        {viewer && !isOwner ? (
          <div className="mt-10">
            <ReportButton entityType="campaign" entityId={c.id} label="Report campaign" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
