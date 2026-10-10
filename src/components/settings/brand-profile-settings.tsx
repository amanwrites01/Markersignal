"use client";

import { useRouter } from "next/navigation";
import { BrandBasicsForm, BrandContactForm, ProfileLinksForm } from "@/components/onboarding/brand-forms";
import type { BrandBasicsInput, BrandContactInput, ProfileLinksInput } from "@/lib/validation/brand";
import type { Option } from "@/lib/data/taxonomy";

export function BrandProfileSettings({
  section,
  userId,
  industries,
  basics,
  links,
  contact,
}: {
  section: "basics" | "links" | "contact";
  userId: string;
  industries: Option[];
  basics: BrandBasicsInput;
  links: ProfileLinksInput;
  contact: BrandContactInput;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();
  if (section === "basics") return <BrandBasicsForm initial={basics} industries={industries} userId={userId} submitLabel="Save" step={1} onSaved={refresh} />;
  if (section === "links") return <ProfileLinksForm initial={links} submitLabel="Save" onSaved={refresh} />;
  return <BrandContactForm initial={contact} submitLabel="Save" step={3} onSaved={refresh} />;
}
