import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PortfolioManager } from "@/components/creator/portfolio-manager";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const [taxonomy, { data: items }] = await Promise.all([
    getTaxonomy(),
    supabase
      .from("portfolio_items")
      .select("id, title, description, category_id, deliverable_type_id, platform_id, industry_id, client_name, media_type, media_path, external_url")
      .eq("creator_id", viewer.id)
      .order("sort_order")
      .order("created_at"),
  ]);
  return (
    <>
      <PageHeader eyebrow="Creator" title="Portfolio" description="Show the work you want to be hired for. Tag each piece so brands — and matching — can see your experience." />
      <PortfolioManager items={items ?? []} taxonomy={taxonomy} userId={viewer.id} />
    </>
  );
}
