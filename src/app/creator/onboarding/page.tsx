import type { Metadata } from "next";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { WizardFrame } from "@/components/onboarding/wizard-frame";
import { CreatorWizardStep } from "@/components/onboarding/creator-wizard";
import { FinishOnboardingButton } from "@/components/onboarding/finish-button";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getOwnCreatorProfile } from "@/lib/data/creators";

export const metadata: Metadata = { title: "Set up your creator profile" };

const STEPS = ["Basics", "Creative DNA", "Rates & availability", "Finish"];
const COPY: Record<number, { title: string; description: string }> = {
  1: { title: "Introduce yourself", description: "This is the top of your public profile." },
  2: { title: "Your Creative DNA", description: "Brands search and match on these. Be specific — fewer, truer tags match better than many." },
  3: { title: "Rates and availability", description: "Indicative only. You always quote per project and nothing is ever accepted on your behalf." },
  4: { title: "You're nearly there", description: "Finish now and add portfolio pieces from your dashboard — or add them first." },
};

export default async function CreatorOnboardingPage({ searchParams }: PageProps<"/creator/onboarding">) {
  const viewer = await requireRole("creator");
  const [taxonomy, own] = await Promise.all([getTaxonomy(), getOwnCreatorProfile(viewer.id)]);
  const p = own.profile;
  const completed = p?.onboarding_step ?? 0;
  const requested = Number((await searchParams).step);
  const step = Number.isInteger(requested) && requested >= 1 && requested <= Math.min(completed + 1, 4) ? requested : Math.min(completed + 1, 4);

  return (
    <WizardFrame steps={STEPS} current={step} completedThrough={completed} baseHref="/creator/onboarding" {...COPY[step]!}>
      {step < 4 ? (
        <CreatorWizardStep
          step={step}
          userId={viewer.id}
          taxonomy={taxonomy}
          basics={{
            displayName: p?.display_name ?? viewer.profile.full_name ?? "",
            slug: p?.slug ?? "",
            headline: p?.headline ?? "",
            bio: p?.bio ?? "",
            locationCity: p?.location_city ?? "",
            locationCountry: p?.location_country ?? "",
            languages: p?.languages ?? [],
            avatarPath: p?.avatar_path ?? null,
          }}
          dna={{ categoryIds: own.categoryIds, skillIds: own.skillIds, styleIds: own.styleIds, platformIds: own.platformIds }}
          rates={{
            startingRate: p?.starting_rate_cents != null ? String(p.starting_rate_cents / 100) : "",
            currency: (p?.currency as "USD") ?? "USD",
            availability: (p?.availability as "available") ?? "available",
            availableFrom: p?.available_from ?? "",
            collaborationTypes: (p?.collaboration_types as ("remote" | "on_site" | "hybrid")[]) ?? ["remote"],
            visibility: (p?.visibility as "public") ?? "public",
          }}
        />
      ) : (
        <div className="grid gap-6">
          <ul className="grid gap-2">
            {[
              { label: "Basics", done: completed >= 1 },
              { label: "Creative DNA", done: completed >= 2 },
              { label: "Rates & availability", done: completed >= 3 },
            ].map((i) => (
              <li key={i.label} className="flex items-center gap-2.5 text-sm">
                {i.done ? <Check className="size-4 text-success" aria-hidden /> : <Circle className="size-4 text-gray-brand" aria-hidden />}
                {i.label}
                <span className="sr-only">{i.done ? "complete" : "incomplete"}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-lime-soft p-5 text-sm">
            <p className="font-medium">Tip: three portfolio pieces make a big difference.</p>
            <p className="mt-1 text-forest/80">
              Matching looks at portfolio pieces to judge deliverable experience. You can add them any time from Portfolio.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline" size="lg">
              <Link href="/creator/portfolio">Add portfolio first</Link>
            </Button>
            <FinishOnboardingButton />
          </div>
        </div>
      )}
    </WizardFrame>
  );
}
