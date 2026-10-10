import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CampaignForm, EMPTY_CAMPAIGN } from "@/components/brand/campaign-form";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage() {
  await requireRole("brand");
  const taxonomy = await getTaxonomy();
  return (
    <>
      <PageHeader
        eyebrow="Campaigns"
        title="New campaign"
        description="Start from scratch, or let the Brief-to-Reality Simulator draft a structured brief you can edit."
        actions={
          <Button asChild variant="outline">
            <Link href="/brand/campaigns/simulator">
              <Sparkles aria-hidden /> Draft with the simulator
            </Link>
          </Button>
        }
      />
      <CampaignForm id={null} initial={EMPTY_CAMPAIGN} taxonomy={taxonomy} />
    </>
  );
}
