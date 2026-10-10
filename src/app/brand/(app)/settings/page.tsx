import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/page-header";
import { AccountSettings } from "@/components/settings/account-settings";
import { BrandProfileSettings } from "@/components/settings/brand-profile-settings";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getOwnBrandProfile } from "@/lib/data/brands";
import type { LINK_KINDS, TEAM_SIZES } from "@/lib/validation/brand";

export const metadata: Metadata = { title: "Settings" };

export default async function BrandSettingsPage() {
  const viewer = await requireRole("brand");
  const [taxonomy, own] = await Promise.all([getTaxonomy(), getOwnBrandProfile(viewer.id)]);
  const p = own.profile!;
  const common = {
    userId: viewer.id,
    industries: taxonomy.industries,
    basics: {
      brandName: p.brand_name, slug: p.slug, industryId: p.industry_id, description: p.description ?? "",
      website: p.website ?? "", locationCountry: p.location_country ?? "", logoPath: p.logo_path,
    },
    links: { links: own.links.map((l) => ({ kind: l.kind as (typeof LINK_KINDS)[number], url: l.url })) },
    contact: {
      contactName: own.contact?.contact_name ?? "",
      contactEmail: own.contact?.contact_email ?? "",
      contactPhone: own.contact?.contact_phone ?? "",
      teamSize: (p.team_size as (typeof TEAM_SIZES)[number] | null) ?? null,
    },
  };
  return (
    <>
      <PageHeader eyebrow="Brand" title="Settings" description="Brand profile, team contact, account and data." />
      <div className="grid gap-6">
        <Panel>
          <h2 className="h-section mb-5">Brand profile</h2>
          <BrandProfileSettings section="basics" {...common} />
        </Panel>
        <Panel>
          <h2 className="h-section mb-5">Links</h2>
          <BrandProfileSettings section="links" {...common} />
        </Panel>
        <Panel>
          <h2 className="h-section mb-5">Team contact</h2>
          <BrandProfileSettings section="contact" {...common} />
        </Panel>
        <AccountSettings viewer={viewer} />
      </div>
    </>
  );
}
