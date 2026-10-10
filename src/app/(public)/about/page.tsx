import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About", description: "Why MAKERSIGNAL exists and how it works." };

const PRINCIPLES = [
  { title: "Show the reasoning", body: "Every match comes with the factors behind it. Scores are estimates from profile and brief data — a starting point for your judgement." },
  { title: "Rights in writing", body: "Usage terms are recorded field by field and approved by both sides. AI-training permission is never assumed." },
  { title: "Nothing silently changes", body: "Deliverable versions are kept, status changes are logged, and editing agreed terms resets approval." },
  { title: "AI that assists, never acts", body: "AI drafts and summarises. It can't publish, accept, price or approve anything on anyone's behalf." },
];

export default function AboutPage() {
  return (
    <>
      <section className="container-page max-w-4xl py-16 sm:py-24">
        <p className="eyebrow">About MAKERSIGNAL</p>
        <h1 className="display mt-4 text-4xl sm:text-6xl">Creativity, Connected.</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-muted">
          MAKERSIGNAL is a marketplace for brands and content creators built around clear briefs, explainable matching and usage rights both sides
          can read. We think creative collaboration works better when expectations are visible from the start.
        </p>
      </section>
      <section className="border-y border-line bg-white py-16">
        <div className="container-page grid gap-8 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="border-t-2 border-forest pt-5">
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="container-page max-w-4xl py-16">
        <h2 className="text-2xl font-semibold">What we don&apos;t do (yet)</h2>
        <p className="mt-3 text-ink-muted">
          MAKERSIGNAL doesn&apos;t process payments today. Quotes and milestone amounts are recorded for planning only — no money is held, escrowed or
          transferred through the platform.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/auth/sign-up">Join MAKERSIGNAL</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
