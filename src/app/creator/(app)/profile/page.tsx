import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ProfileSections } from "@/components/creator/profile-sections";
import { ServicesManager } from "@/components/creator/services-manager";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getOwnCreatorProfile } from "@/lib/data/creators";
import { createClient } from "@/lib/supabase/server";
import type { LINK_KINDS } from "@/lib/validation/brand";

export const metadata: Metadata = { title: "Profile & Creative DNA" };

export default async function CreatorProfilePage() {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const [taxonomy, own, { data: services }] = await Promise.all([
    getTaxonomy(),
    getOwnCreatorProfile(viewer.id),
    supabase.from("creator_services").select("*").eq("creator_id", viewer.id).order("created_at"),
  ]);
  const p = own.profile!;
  const common = {
    userId: viewer.id,
    taxonomy,
    basics: {
      displayName: p.display_name, slug: p.slug, headline: p.headline ?? "", bio: p.bio ?? "",
      locationCity: p.location_city ?? "", locationCountry: p.location_country ?? "", languages: p.languages, avatarPath: p.avatar_path,
    },
    dna: { categoryIds: own.categoryIds, skillIds: own.skillIds, styleIds: own.styleIds, platformIds: own.platformIds },
    rates: {
      startingRate: p.starting_rate_cents != null ? String(p.starting_rate_cents / 100) : "",
      currency: p.currency as "USD",
      availability: p.availability as "available",
      availableFrom: p.available_from ?? "",
      collaborationTypes: p.collaboration_types as ("remote" | "on_site" | "hybrid")[],
      visibility: p.visibility as "public",
    },
    links: { links: own.links.map((l) => ({ kind: l.kind as (typeof LINK_KINDS)[number], url: l.url })) },
  };

  return (
    <>
      <PageHeader
        eyebrow="Creator"
        title="Profile & Creative DNA"
        description="Everything brands see on your public profile, and what matching uses."
        actions={
          <Button asChild variant="outline">
            <Link href={`/creators/${p.slug}`} target="_blank">
              View public profile <ExternalLink aria-hidden />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6">
        <Panel>
          <h2 className="h-section mb-5">Basics</h2>
          <ProfileSections section="basics" {...common} />
        </Panel>
        <Panel>
          <h2 id="dna" className="h-section mb-5 scroll-mt-24">Creative DNA</h2>
          <ProfileSections section="dna" {...common} />
        </Panel>
        <Panel>
          <h2 id="rates" className="h-section mb-5 scroll-mt-24">Rates, availability & visibility</h2>
          <ProfileSections section="rates" {...common} />
        </Panel>
        <Panel>
          <h2 id="services" className="h-section mb-1 scroll-mt-24">Services</h2>
          <p className="meta mb-5">Indicative starting prices. You always send a specific quote per project.</p>
          <ServicesManager services={services ?? []} deliverableTypes={taxonomy.deliverableTypes} />
        </Panel>
        <Panel>
          <h2 className="h-section mb-5">Links</h2>
          <ProfileSections section="links" {...common} />
        </Panel>
      </div>
    </>
  );
}
