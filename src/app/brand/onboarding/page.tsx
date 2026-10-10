import type { Metadata } from "next";
import { WizardFrame } from "@/components/onboarding/wizard-frame";
import { BrandWizardStep } from "@/components/onboarding/brand-wizard";
import { FinishOnboardingButton } from "@/components/onboarding/finish-button";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getOwnBrandProfile } from "@/lib/data/brands";
import type { LINK_KINDS, TEAM_SIZES } from "@/lib/validation/brand";

export const metadata: Metadata = { title: "Set up your brand" };

const STEPS = ["Brand basics", "Links", "Team contact", "Finish"];
const COPY: Record<number, { title: string; description: string }> = {
  1: { title: "Tell creators about your brand", description: "Shown on your campaigns. A clear description leads to better proposals." },
  2: { title: "Where can creators see your brand?", description: "Social profiles help creators understand your existing tone. Optional." },
  3: { title: "Team contact", description: "Private to your account." },
  4: { title: "Ready to brief creators", description: "Create your first campaign — or try the Brief-to-Reality Simulator to draft one." },
};

export default async function BrandOnboardingPage({ searchParams }: PageProps<"/brand/onboarding">) {
  const viewer = await requireRole("brand");
  const [taxonomy, own] = await Promise.all([getTaxonomy(), getOwnBrandProfile(viewer.id)]);
  const p = own.profile;
  const completed = p?.onboarding_step ?? 0;
  const requested = Number((await searchParams).step);
  const step = Number.isInteger(requested) && requested >= 1 && requested <= Math.min(completed + 1, 4) ? requested : Math.min(completed + 1, 4);
  const basics = {
    brandName: p?.brand_name ?? "",
    slug: p?.slug ?? "",
    industryId: p?.industry_id ?? null,
    description: p?.description ?? "",
    website: p?.website ?? "",
    locationCountry: p?.location_country ?? "",
    logoPath: p?.logo_path ?? null,
  };

  return (
    <WizardFrame steps={STEPS} current={step} completedThrough={completed} baseHref="/brand/onboarding" {...COPY[step]!}>
      {step < 4 ? (
        <BrandWizardStep
          step={step}
          userId={viewer.id}
          industries={taxonomy.industries}
          basics={basics}
          links={{ links: own.links.map((l) => ({ kind: l.kind as (typeof LINK_KINDS)[number], url: l.url })) }}
          contact={{
            contactName: own.contact?.contact_name ?? "",
            contactEmail: own.contact?.contact_email ?? viewer.email ?? "",
            contactPhone: own.contact?.contact_phone ?? "",
            teamSize: (p?.team_size as (typeof TEAM_SIZES)[number] | null) ?? null,
          }}
        />
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <FinishOnboardingButton>Finish and go to dashboard</FinishOnboardingButton>
        </div>
      )}
    </WizardFrame>
  );
}
