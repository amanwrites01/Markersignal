import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CampaignForm } from "@/components/brand/campaign-form";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { campaignToInput, getCampaignDetail } from "@/lib/data/campaigns";

export const metadata: Metadata = { title: "Edit campaign" };

export default async function EditCampaignPage({ params }: PageProps<"/brand/campaigns/[id]/edit">) {
  const viewer = await requireRole("brand");
  const { id } = await params;
  const [detail, taxonomy] = await Promise.all([getCampaignDetail(id), getTaxonomy()]);
  if (!detail || detail.campaign.brand_id !== viewer.id) notFound();
  if (["closed", "archived"].includes(detail.campaign.status)) redirect(`/brand/campaigns/${id}`);
  return (
    <>
      <PageHeader eyebrow="Edit campaign" title={detail.campaign.title} />
      <CampaignForm id={id} initial={campaignToInput(detail)} taxonomy={taxonomy} status={detail.campaign.status} />
    </>
  );
}
