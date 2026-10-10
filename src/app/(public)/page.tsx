import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Blocks, EyeOff, FileSignature, Fingerprint, Lightbulb, Scale, ShieldCheck, Sparkles, UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { CampaignCard } from "@/components/marketplace/campaign-card";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  { n: "01", title: "Brief clearly", body: "Brands describe the objective, audience, deliverables, budget and usage rights — or draft it with the Brief-to-Reality Simulator." },
  { n: "02", title: "Match with reasons", body: "Creative DNA compares style, skills, portfolio, platforms, budget and timing — and explains every match in plain language." },
  { n: "03", title: "Propose and agree", body: "Creators send structured proposals. Accepted proposals become projects with agreed scope and a Rights Passport." },
  { n: "04", title: "Deliver with a trail", body: "Milestones, versioned deliverables, revision requests and approvals — all recorded, nothing silently overwritten." },
];

const FEATURES = [
  { icon: Fingerprint, title: "Creative DNA", body: "Style, skills and portfolio evidence — not follower counts — drive discovery and matching." },
  { icon: FileSignature, title: "Rights Passport", body: "Platforms, paid use, territory, duration, exclusivity and AI-training permission, approved by both sides." },
  { icon: Lightbulb, title: "Brief-to-Reality Simulator", body: "Turns a rough idea into an editable brief with deliverables, timeline, open questions and scope warnings." },
  { icon: Scale, title: "Scope-to-Price Translator", body: "Shows what drives cost — usage, exclusivity, raw files, revisions, rush timing — before anyone negotiates." },
  { icon: EyeOff, title: "Blind Brief Room", body: "Optionally review proposals on approach and work first, then reveal who wrote them." },
  { icon: UsersRound, title: "Squad Builder", body: "Plan multi-creator campaigns by role, see skill coverage and gaps, and invite each person individually." },
];

const FAQ = [
  {
    q: "How does matching work?",
    a: "Each match score is an estimate from the information on a creator's profile and a campaign brief: skills, creative style, portfolio evidence, categories, platforms, budget fit and availability. Every score shows the factors behind it. We never use sensitive personal attributes, and a score is a starting point for your judgement, not a verdict.",
  },
  {
    q: "Is the Rights Passport a contract?",
    a: "It's a structured record of the usage terms both parties approved. Whether those terms are legally enforceable depends on your agreement and the applicable law — we recommend a written agreement for significant work. You can export the record at any time.",
  },
  {
    q: "Do you handle payments?",
    a: "Not yet. Quotes, project amounts and milestone allocations are recorded for planning, but MAKERSIGNAL doesn't hold, transfer or escrow money today.",
  },
  {
    q: "Will my content be used to train AI?",
    a: "No permission for AI training is ever inferred from uploading work. It's a separate, explicit opt-in on each Rights Passport and is off by default.",
  },
  {
    q: "What does the AI actually do?",
    a: "It drafts briefs, summarises proposals, explains matches and flags scope or budget gaps. Everything it produces is labelled, editable, and never acts for you — it can't publish a campaign, accept a proposal or change a price.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [creators, campaigns] = await Promise.all([
    supabase.rpc("search_creators", { p_sort: "newest", p_limit: 4 }),
    supabase.rpc("search_campaigns", { p_sort: "newest", p_limit: 3 }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute top-[-180px] right-[-120px] size-[560px] rounded-full border border-forest/10" />
        <div aria-hidden className="pointer-events-none absolute top-[-60px] right-[0px] size-[340px] rounded-full border border-forest/15" />
        <div className="container-page relative grid gap-12 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="eyebrow">Creativity, Connected.</p>
            <h1 className="display mt-5 max-w-4xl">
              The creator marketplace that <span className="relative whitespace-nowrap"><span className="relative z-10">shows its work</span><span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-lime sm:bottom-2 sm:h-5" /></span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              MAKERSIGNAL matches brands and content creators on creative style and real portfolio evidence, explains every match, and keeps scope,
              deliverables and usage rights on one clear record.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/explore/creators">
                  Find creators <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/explore/campaigns">Find opportunities</Link>
              </Button>
            </div>
          </div>
          <div className="on-dark rounded-3xl bg-forest p-6 text-ivory shadow-[0_30px_80px_-40px_rgba(20,36,28,0.8)]">
            <div className="flex items-center justify-between">
              <p className="text-xs tracking-[0.14em] text-ivory/60 uppercase">Example match</p>
              <span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-forest">Strong · 86</span>
            </div>
            <p className="mt-5 text-lg leading-snug font-medium">
              “Specialises in short-form product videos, has relevant skincare portfolio work, and fits your stated budget.”
            </p>
            <ul className="mt-6 grid gap-2.5 text-sm">
              {[
                ["Creative style", "Minimalist · Editorial", 92],
                ["Deliverable experience", "4 short-form product films", 88],
                ["Budget fit", "Starting rate within range", 80],
                ["Timing", "Available before deadline", 100],
              ].map(([label, detail, v]) => (
                <li key={label as string}>
                  <div className="flex justify-between text-ivory/80">
                    <span>{label}</span>
                    <span className="text-ivory/60">{detail}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-lime" style={{ width: `${v}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-ivory/50">Illustrative example. Scores are estimates from profile and brief data.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-white py-20">
        <div className="container-page">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">From brief to approved deliverable, without the guesswork.</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t-2 border-forest pt-5">
                <p className="font-mono text-sm text-ink-muted">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured creators */}
      <section className="py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Creators</p>
              <h2 className="mt-3 text-3xl font-semibold">Recently joined creators</h2>
            </div>
            <Link href="/explore/creators" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
              Explore all creators <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(creators.data ?? []).map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
          {!creators.data?.length ? <EmptyState className="mt-8" title="No public creator profiles yet" description="Be one of the first — profiles appear here once published." /> : null}
        </div>
      </section>

      {/* Differentiators */}
      <section className="on-dark bg-forest py-20 text-ivory">
        <div className="container-page">
          <p className="eyebrow !text-lime">Why MAKERSIGNAL</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">Built for transparency on both sides of the brief.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-forest p-7">
                <f.icon className="size-6 text-lime" aria-hidden />
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ivory/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured campaigns */}
      <section className="py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Opportunities</p>
              <h2 className="mt-3 text-3xl font-semibold">Open campaigns</h2>
            </div>
            <Link href="/explore/campaigns" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
              See all opportunities <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(campaigns.data ?? []).map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
          {!campaigns.data?.length ? <EmptyState className="mt-8" title="No open campaigns right now" description="Published briefs appear here as brands post them." /> : null}
        </div>
      </section>

      {/* AI matching + trust */}
      <section className="border-y border-line bg-white py-20">
        <div className="container-page grid gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow">How AI matching works</p>
            <h2 className="mt-3 text-3xl font-semibold">A score you can read, not a black box.</h2>
            <p className="mt-4 text-ink-muted">
              Matching starts with a deterministic, documented method that weighs eight factors from the brief and the creator&apos;s profile. AI is used
              only to help phrase explanations and draft briefs — and it is always labelled.
            </p>
            <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              {["Relevant skills", "Portfolio relevance", "Creative-style compatibility", "Category & industry fit", "Platform expertise", "Budget compatibility", "Availability vs deadline", "Deliverable experience"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Sparkles className="size-4 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-muted">
              Never used: age, gender, ethnicity, religion, health, or any other sensitive attribute.
            </p>
          </div>
          <div>
            <p className="eyebrow">Trust, licensing & collaboration</p>
            <h2 className="mt-3 text-3xl font-semibold">Clear terms before the first frame.</h2>
            <ul className="mt-6 grid gap-5">
              {[
                { icon: FileSignature, title: "Two-party Rights Passport", body: "Each side approves the exact usage terms. Any edit resets approval, so nobody agrees to a version they didn't see." },
                { icon: Blocks, title: "Versioned deliverables", body: "New uploads never replace earlier versions. Feedback and approvals are tied to the version they were about." },
                { icon: BadgeCheck, title: "Verified-project reviews", body: "Reviews can only be left after a completed MAKERSIGNAL project, once per side." },
                { icon: ShieldCheck, title: "Private by default", body: "Project files live in private storage and open through short-lived, permission-checked links." },
              ].map((t) => (
                <li key={t.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-soft text-forest">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">{t.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold">Straight answers.</h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full border border-line transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[65ch] text-[15px] leading-7 text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container-page">
          <div className="on-dark flex flex-col items-start justify-between gap-6 rounded-3xl bg-deep p-8 text-ivory sm:p-12 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold">Ready when your next brief is.</h2>
              <p className="mt-2 text-ivory/70">Free to join for creators and brands during the MVP.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/auth/sign-up">Create an account</Link>
              </Button>
              <Button asChild size="lg" variant="outline-dark">
                <Link href="/explore/creators">Browse creators</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
