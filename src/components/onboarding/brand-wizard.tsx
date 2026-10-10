"use client";

import { useRouter } from "next/navigation";
import { BrandBasicsForm, BrandContactForm, ProfileLinksForm } from "./brand-forms";
import type { BrandBasicsInput, BrandContactInput, ProfileLinksInput } from "@/lib/validation/brand";
import type { Option } from "@/lib/data/taxonomy";

export function BrandWizardStep({
  step,
  userId,
  industries,
  basics,
  links,
  contact,
}: {
  step: number;
  userId: string;
  industries: Option[];
  basics: BrandBasicsInput;
  links: ProfileLinksInput;
  contact: BrandContactInput;
}) {
  const router = useRouter();
  const go = (n: number) => () => {
    router.push(`/brand/onboarding?step=${n}`);
    router.refresh();
  };
  if (step === 1) return <BrandBasicsForm initial={basics} industries={industries} userId={userId} onSaved={go(2)} />;
  if (step === 2)
    return <ProfileLinksForm initial={links} step={2} onSaved={go(3)} />;
  return <BrandContactForm initial={contact} onSaved={go(4)} />;
}
