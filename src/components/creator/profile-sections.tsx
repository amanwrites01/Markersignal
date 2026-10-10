"use client";

import { useRouter } from "next/navigation";
import { CreatorBasicsForm, CreatorDnaForm, CreatorRatesForm } from "@/components/onboarding/creator-forms";
import { ProfileLinksForm } from "@/components/onboarding/brand-forms";
import type { CreatorBasicsInput, CreatorDnaInput, CreatorRatesInput } from "@/lib/validation/creator";
import type { ProfileLinksInput } from "@/lib/validation/brand";
import type { Taxonomy } from "@/lib/data/taxonomy";

export function ProfileSections({
  section,
  userId,
  taxonomy,
  basics,
  dna,
  rates,
  links,
}: {
  section: "basics" | "dna" | "rates" | "links";
  userId: string;
  taxonomy: Taxonomy;
  basics: CreatorBasicsInput;
  dna: CreatorDnaInput;
  rates: CreatorRatesInput;
  links: ProfileLinksInput;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  if (section === "basics") return <CreatorBasicsForm initial={basics} userId={userId} submitLabel="Save" step={1} onSaved={refresh} />;
  if (section === "dna") return <CreatorDnaForm initial={dna} taxonomy={taxonomy} submitLabel="Save Creative DNA" step={2} onSaved={refresh} />;
  if (section === "rates") return <CreatorRatesForm initial={rates} submitLabel="Save" step={3} onSaved={refresh} />;
  return <ProfileLinksForm initial={links} submitLabel="Save links" onSaved={refresh} />;
}
