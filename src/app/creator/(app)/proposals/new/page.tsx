import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getCampaignDetail } from "@/lib/data/campaigns";
import { campaignAcceptsProposals, getSampleOptions } from "@/lib/data/proposals";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New proposal" };

export default async function NewProposalPage({ searchParams }: PageProps<"/creator/proposals/new">) {
  const viewer = await requireRole("creator");
  const campaignId = (await searchParams).campaign;
  if (typeof campaignId !== "string" || !/^[0-9a-f-]{36}$/i.test(campaignId)) notFound();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("proposals").select("id").eq("campaign_id", campaignId).eq("creator_id", viewer.id).maybeSingle();
  if (existing) redirect(`/creator/proposals/${existing.id}`);

  const [detail, taxonomy, samples] = await Promise.all([getCampaignDetail(campaignId), getTaxonomy(), getSampleOptions(viewer.id)]);
  if (!detail) notFound();
  const c = detail.campaign;
  const status = campaignAcceptsProposals(c);

  return (
    <>
      <PageHeader eyebrow={`Proposal for ${c.brand_profiles?.brand_name ?? "brand"}`} title={c.title} description="Draft your proposal. Nothing is sent until you submit it." />
      {!status.open ? (
        <EmptyState
          title="This campaign isn't accepting proposals"
          description={status.reason}
          action={
            <Button asChild variant="outline">
              <Link href={`/campaigns/${c.id}`}>Back to the brief</Link>
            </Button>
          }
        />
      ) : (
        <ProposalForm
          proposalId={null}
          campaignId={c.id}
          deliverableTypes={taxonomy.deliverableTypes}
          platforms={taxonomy.platforms}
          samples={samples}
          campaign={{ budgetMin: c.budget_min_cents, budgetMax: c.budget_max_cents, currency: c.currency, deadline: c.deadline, revisionsExpected: c.revisions_expected }}
          initial={{
            approach: "",
            timelineDays: null,
            proposedDeliveryDate: c.deadline ?? "",
            quote: "",
            currency: c.currency as "USD",
            revisionsIncluded: c.revisions_expected,
            usageNotes: "",
            deliverables: detail.deliverables.map((d) => ({
              deliverableTypeId: d.deliverable_type_id,
              platformId: d.platform_id,
              quantity: d.quantity,
              description: d.description ?? "",
              price: "",
            })),
            portfolioItemIds: [],
          }}
        />
      )}
    </>
  );
}
