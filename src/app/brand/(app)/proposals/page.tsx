import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { NativeSelectNav } from "@/components/proposals/campaign-filter";
import { BrandProposalCard, type BrandProposal } from "@/components/proposals/brand-proposal-card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { compareProposal } from "@/lib/proposal-compare";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Proposals" };

const TABS = [
  { key: "open", label: "To review", statuses: ["submitted", "under_review"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  { key: "closed", label: "Declined & withdrawn", statuses: ["rejected", "withdrawn"] },
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BrandProposalsPage({ searchParams }: PageProps<"/brand/proposals">) {
  const viewer = await requireRole("brand");
  const sp = await searchParams;
  const campaignId = typeof sp.campaign === "string" && UUID.test(sp.campaign) ? sp.campaign : null;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0]!;
  const supabase = await createClient();
  const [{ data: proposals }, { data: campaigns }] = await Promise.all([
    // Identity masking for blind campaigns happens in the database function.
    supabase.rpc("brand_list_proposals", campaignId ? { p_campaign_id: campaignId } : {}),
    supabase
      .from("campaigns")
      .select("id, title, budget_min_cents, budget_max_cents, currency, deadline, revisions_expected")
      .eq("brand_id", viewer.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
  ]);
  const byCampaign = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const all = (proposals ?? []) as unknown as (BrandProposal & { campaign_id: string })[];
  const rows = all.filter((p) => tab.statuses.includes(p.status));
  const qs = (t: string) => `/brand/proposals?tab=${t}${campaignId ? `&campaign=${campaignId}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Brand" title="Proposals" description="Compare proposals against your brief. Nothing is agreed until you accept." />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line">
        <nav aria-label="Proposal status" className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={qs(t.key)}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm whitespace-nowrap", t.key === tab.key ? "border-forest font-medium" : "border-transparent text-ink-muted hover:text-forest")}
            >
              {t.label} <span className="ml-1 text-xs text-ink-muted">{all.filter((p) => t.statuses.includes(p.status)).length}</span>
            </Link>
          ))}
        </nav>
        <div className="mb-2 w-full sm:w-72">
          <NativeSelectNav
            label="Campaign"
            value={campaignId ?? ""}
            options={[{ value: "", label: "All campaigns" }, ...(campaigns ?? []).map((c) => ({ value: c.id, label: c.title }))]}
            base={`/brand/proposals?tab=${tab.key}`}
            param="campaign"
          />
        </div>
      </div>
      {rows.length ? (
        <div className="grid gap-5">
          {rows.map((p) => {
            const c = byCampaign.get(p.campaign_id);
            return <BrandProposalCard key={p.id} p={p} comparisons={c ? compareProposal(p, c) : []} />;
          })}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title={tab.key === "open" ? "Nothing to review right now" : `No ${tab.label.toLowerCase()} proposals`}
          description="Proposals arrive when creators respond to your published campaigns or invitations."
        />
      )}
    </>
  );
}
