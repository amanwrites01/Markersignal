"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckSquare, HelpCircle, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { ChipSelect } from "@/components/inputs/chip-select";
import { CURRENCIES } from "@/lib/validation/common";
import { analyseScope } from "@/lib/pricing/scope";
import { daysUntil, formatMoney } from "@/lib/format";
import Link from "next/link";
import { createDraftFromBrief, runBriefSimulator } from "@/server/ai";
import type { BriefOutput } from "@/lib/ai/services";
import type { Taxonomy } from "@/lib/data/taxonomy";

type Idea = {
  objective: string;
  product: string;
  audience: string;
  platforms: string[];
  budgetMin: string;
  budgetMax: string;
  currency: string;
  deadline: string;
  styles: string[];
  formats: string;
};

export function BriefSimulator({ taxonomy, aiReady }: { taxonomy: Taxonomy; aiReady: boolean }) {
  const router = useRouter();
  const [idea, setIdea] = useState<Idea>({ objective: "", product: "", audience: "", platforms: [], budgetMin: "", budgetMax: "", currency: "USD", deadline: "", styles: [], formats: "" });
  const [draft, setDraft] = useState<BriefOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();
  const name = (list: { slug: string; name: string }[], slug: string | null) => list.find((x) => x.slug === slug)?.name ?? slug ?? "Any";

  const budgetCheck = useMemo(() => {
    if (!draft) return null;
    const lines = draft.deliverables.map((d) => {
      const t = taxonomy.deliverableTypes.find((x) => x.slug === d.deliverableType);
      return { deliverableTypeId: t?.id ?? null, name: t?.name ?? d.deliverableType, quantity: d.quantity, effortUnits: t?.effortUnits ?? 1 };
    });
    const days = idea.deadline ? Math.max(1, daysUntil(idea.deadline) ?? 1) : null;
    return analyseScope({
      lines, revisions: 2, timelineDays: days, paidAds: false, usageMonths: 12, exclusivity: "none", rawFiles: false,
      budgetMinCents: idea.budgetMin ? Math.round(Number(idea.budgetMin) * 100) : null,
      budgetMaxCents: idea.budgetMax ? Math.round(Number(idea.budgetMax) * 100) : null,
      currency: idea.currency,
    });
  }, [draft, idea, taxonomy.deliverableTypes]);

  const set = <K extends keyof Idea>(k: K, v: Idea[K]) => setIdea((s) => ({ ...s, [k]: v }));
  const edit = <K extends keyof BriefOutput>(k: K, v: BriefOutput[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <div className="grid gap-8">
      {!aiReady ? (
        <div role="status" className="flex gap-3 rounded-2xl border border-warning/25 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>
            AI isn&apos;t configured on this site yet (no <code>ANTHROPIC_API_KEY</code>), so the simulator can&apos;t generate a brief. You can still{" "}
            <Link href="/brand/campaigns/new" className="font-medium underline underline-offset-4">create a campaign manually</Link> — the Scope-to-Price
            checks there work without AI.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h2 className="h-section">Your idea</h2>
        <p className="meta mt-1">Rough notes are fine. Everything the simulator produces is editable before anything is saved.</p>
        <div className="mt-6 grid gap-5">
          <FormError message={error} />
          <Field label="Campaign objective" htmlFor="sim-objective" hint="What should the content achieve?">
            <Textarea rows={3} value={idea.objective} onChange={(e) => set("objective", e.target.value)} placeholder="e.g. Launch our summer juice range to young professionals in Mumbai and Pune." />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Product or service" htmlFor="sim-product" optional>
              <Textarea rows={3} value={idea.product} onChange={(e) => set("product", e.target.value)} placeholder="What it is, key features, price point." />
            </Field>
            <Field label="Audience" htmlFor="sim-audience" optional>
              <Textarea rows={3} value={idea.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Who you want to reach." />
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Platforms</legend>
            <ChipSelect label="Platforms" options={taxonomy.platforms.map((p) => ({ id: p.slug, name: p.name }))} value={idea.platforms} onChange={(v) => set("platforms", v as string[])} />
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Desired style</legend>
            <ChipSelect label="Desired style" options={taxonomy.styles.map((s) => ({ id: s.slug, name: s.name, description: s.description }))} value={idea.styles} max={5} onChange={(v) => set("styles", v as string[])} />
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Budget from" htmlFor="sim-bmin" optional>
              <Input inputMode="decimal" value={idea.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} placeholder="e.g. 500" />
            </Field>
            <Field label="Budget up to" htmlFor="sim-bmax" optional>
              <Input inputMode="decimal" value={idea.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} placeholder="e.g. 1500" />
            </Field>
            <Field label="Currency" htmlFor="sim-cur">
              <NativeSelect value={idea.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Deadline" htmlFor="sim-deadline" optional>
              <Input type="date" value={idea.deadline} onChange={(e) => set("deadline", e.target.value)} />
            </Field>
          </div>
          <Field label="Content formats you have in mind" htmlFor="sim-formats" optional>
            <Input value={idea.formats} onChange={(e) => set("formats", e.target.value)} placeholder="e.g. a few reels and a photo set" />
          </Field>
          <div className="flex justify-end">
            <Button
              disabled={!aiReady || running || idea.objective.trim().length < 10}
              onClick={() =>
                startRun(async () => {
                  setError(null);
                  const r = await runBriefSimulator({
                    ...idea,
                    budgetMin: idea.budgetMin ? Number(idea.budgetMin) : null,
                    budgetMax: idea.budgetMax ? Number(idea.budgetMax) : null,
                  });
                  if (r.ok) setDraft(r.data);
                  else setError(r.error);
                })
              }
            >
              {running ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {running ? "Drafting — this can take up to a minute…" : draft ? "Regenerate" : "Generate brief"}
            </Button>
          </div>
        </div>
      </section>

      {draft ? (
        <section className="grid gap-6" aria-label="Generated brief">
          <div className="flex items-start gap-3 rounded-2xl border border-forest/15 bg-lime-soft p-4 text-sm">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <strong>AI-assisted draft.</strong> Review and edit it. It makes no promises about performance, and nothing is published until you save it and choose
              Publish yourself.
            </p>
          </div>

          <div className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
            <Field label="Title" htmlFor="d-title">
              <Input value={draft.title} onChange={(e) => edit("title", e.target.value)} />
            </Field>
            <Field label="Objective" htmlFor="d-objective">
              <Textarea rows={2} value={draft.objective} onChange={(e) => edit("objective", e.target.value)} />
            </Field>
            <Field label="Brief" htmlFor="d-brief">
              <Textarea rows={8} value={draft.brief} onChange={(e) => edit("brief", e.target.value)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Target audience" htmlFor="d-aud">
                <Textarea rows={3} value={draft.targetAudience} onChange={(e) => edit("targetAudience", e.target.value)} />
              </Field>
              <Field label="Content concept" htmlFor="d-concept">
                <Textarea rows={3} value={draft.concept} onChange={(e) => edit("concept", e.target.value)} />
              </Field>
            </div>

            <div>
              <p className="text-sm font-medium">Suggested deliverables</p>
              <ul className="mt-2 grid gap-2">
                {draft.deliverables.map((d, i) => (
                  <li key={i} className="grid items-center gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_80px_auto]">
                    <span className="text-sm font-medium">{name(taxonomy.deliverableTypes, d.deliverableType)}</span>
                    <span className="text-sm text-ink-muted">{name(taxonomy.platforms, d.platform)}</span>
                    <Input
                      aria-label="Quantity"
                      type="number"
                      min={1}
                      max={100}
                      value={d.quantity}
                      onChange={(e) => edit("deliverables", draft.deliverables.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x)))}
                    />
                    <Button variant="ghost" size="icon" aria-label="Remove deliverable" onClick={() => edit("deliverables", draft.deliverables.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                    {d.notes ? <p className="text-xs text-ink-muted sm:col-span-4">{d.notes}</p> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Storyboard / outline</p>
                <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-sm">
                  {draft.storyboard.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.step}</span> — {s.description}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-sm font-medium">Estimated timeline</p>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {draft.timeline.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>{p.phase}</span>
                      <span className="text-ink-muted">{p.days} days</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ListCard icon={HelpCircle} title="Questions to clarify" items={draft.clarifyingQuestions} />
            <ListCard icon={AlertTriangle} title="Scope or budget warnings" items={draft.scopeWarnings} empty="No obvious mismatches flagged." />
            <ListCard icon={CheckSquare} title="Proposal checklist" items={draft.proposalChecklist} />
          </div>

          {budgetCheck ? (
            <div className="rounded-2xl border border-line bg-white p-5 text-sm">
              <p className="font-medium">Budget check (deterministic estimate)</p>
              <p className="mt-1">
                Indicative range for these deliverables: <strong>{formatMoney(budgetCheck.lowCents, idea.currency)} – {formatMoney(budgetCheck.highCents, idea.currency)}</strong>.{" "}
                {budgetCheck.budgetComparison.message}
              </p>
              <p className="mt-1 text-xs text-ink-muted">{budgetCheck.disclaimer}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button
              disabled={saving}
              onClick={() =>
                startSave(async () => {
                  const r = await createDraftFromBrief({
                    ...draft,
                    budgetMin: idea.budgetMin ? Number(idea.budgetMin) : null,
                    budgetMax: idea.budgetMax ? Number(idea.budgetMax) : null,
                    currency: idea.currency,
                    deadline: idea.deadline,
                  });
                  if (r.ok) {
                    toast.success("Draft campaign created — review it before publishing");
                    router.push(`/brand/campaigns/${r.data.id}/edit`);
                  } else toast.error(r.error);
                })
              }
            >
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Save as draft campaign
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ListCard({ icon: Icon, title, items, empty }: { icon: typeof HelpCircle; title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" aria-hidden /> {title}
      </p>
      {items.length ? (
        <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">{empty ?? "None."}</p>
      )}
    </div>
  );
}
