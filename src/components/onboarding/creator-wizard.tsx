"use client";

import { useRouter } from "next/navigation";
import { CreatorBasicsForm, CreatorDnaForm, CreatorRatesForm } from "./creator-forms";
import type { CreatorBasicsInput, CreatorDnaInput, CreatorRatesInput } from "@/lib/validation/creator";
import type { Taxonomy } from "@/lib/data/taxonomy";

export function CreatorWizardStep({
  step,
  userId,
  taxonomy,
  basics,
  dna,
  rates,
}: {
  step: number;
  userId: string;
  taxonomy: Taxonomy;
  basics: CreatorBasicsInput;
  dna: CreatorDnaInput;
  rates: CreatorRatesInput;
}) {
  const router = useRouter();
  const go = (n: number) => () => {
    router.push(`/creator/onboarding?step=${n}`);
    router.refresh();
  };
  if (step === 1) return <CreatorBasicsForm initial={basics} userId={userId} onSaved={go(2)} />;
  if (step === 2) return <CreatorDnaForm initial={dna} taxonomy={taxonomy} onSaved={go(3)} />;
  return <CreatorRatesForm initial={rates} onSaved={go(4)} />;
}
