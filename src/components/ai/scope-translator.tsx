"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { analyseScope, type PricingConfig } from "@/lib/pricing/scope";
import { CURRENCIES } from "@/lib/validation/common";
import { formatMoney } from "@/lib/format";
import { aiScopeExplanation } from "@/server/ai";
import { cn } from "@/lib/utils";

type Line = { deliverableTypeId: number | null; quantity: number };
export type ScopeDefaults = {
  lines: Line[];
  revisions: number | null;
  timelineDays: number | null;
  paidAds: boolean;
  usageMonths: number | null;
  exclusivity: "none" | "category" | "full";
  rawFiles: boolean;
  budgetMin: string;
  budgetMax: string;
  currency: string;
};

export function ScopeTranslator({
  defaults,
  deliverableTypes,
  config,
  rates,
  aiReady,
}: {
  defaults: ScopeDefaults;
  deliverableTypes: { id: number; name: string; effortUnits?: number }[];
  config: PricingConfig;
  rates: { name: string; currency: string; baseRateCents: number | null; rateByType: [number, number][] } | null;
  aiReady: boolean;
}) {
  const [s, setS] = useState(defaults);
  const [ai, setAi] = useState<{ explanation: string; scopeGaps: string[]; negotiationQuestions: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ScopeDefaults>(k: K, v: ScopeDefaults[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setAi(null);
  };

  const ratesApply = rates && rates.currency === s.currency;
  const analysis = useMemo(
    () =>
      analyseScope(
        {
          lines: s.lines.map((l) => {
            const t = deliverableTypes.find((d) => d.id === l.deliverableTypeId);
            return { deliverableTypeId: l.deliverableTypeId, name: t?.name ?? "Unspecified", quantity: l.quantity, effortUnits: t?.effortUnits ?? 1 };
          }),
          revisions: s.revisions,
          timelineDays: s.timelineDays,
          paidAds: s.paidAds,
          usageMonths: s.usageMonths,
          exclusivity: s.exclusivity,
          rawFiles: s.rawFiles,
          budgetMinCents: s.budgetMin ? Math.round(Number(s.budgetMin) * 100) : null,
          budgetMaxCents: s.budgetMax ? Math.round(Number(s.budgetMax) * 100) : null,
          currency: s.currency,
          rateByType: ratesApply ? new Map(rates.rateByType) : undefined,
          baseRateCents: ratesApply ? rates.baseRateCents : null,
        },
        config,
      ),
    [s, deliverableTypes, config, rates, ratesApply],
  );
  const num = (v: string) => (v === "" ? null : Math.max(0, Number(v)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h2 className="h-section">Requested scope</h2>
        <ul className="grid gap-2">
          {s.lines.map((l, i) => (
            <li key={i} className="grid grid-cols-[1fr_90px_auto] items-end gap-2">
              <Field label={i === 0 ? "Deliverable" : <span className="sr-only">Deliverable</span>} htmlFor={`line-${i}`}>
                <NativeSelect value={l.deliverableTypeId ?? ""} onChange={(e) => set("lines", s.lines.map((x, j) => (j === i ? { ...x, deliverableTypeId: e.target.value ? Number(e.target.value) : null } : x)))}>
                  <option value="">Choose…</option>
                  {deliverableTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={i === 0 ? "Qty" : <span className="sr-only">Quantity</span>} htmlFor={`qty-${i}`}>
                <Input type="number" min={1} max={100} value={l.quantity} onChange={(e) => set("lines", s.lines.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))} />
              </Field>
              <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => set("lines", s.lines.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" size="sm" onClick={() => set("lines", [...s.lines, { deliverableTypeId: null, quantity: 1 }])}>
            <Plus aria-hidden /> Add deliverable
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Revision rounds" htmlFor="rev" optional>
            <Input type="number" min={0} max={20} value={s.revisions ?? ""} onChange={(e) => set("revisions", num(e.target.value))} placeholder="e.g. 2" />
          </Field>
          <Field label="Timeline (days)" htmlFor="days" optional>
            <Input type="number" min={1} max={365} value={s.timelineDays ?? ""} onChange={(e) => set("timelineDays", num(e.target.value))} placeholder="e.g. 21" />
          </Field>
          <Field label="Usage (months)" htmlFor="months" optional>
            <Input type="number" min={1} max={120} value={s.usageMonths ?? ""} onChange={(e) => set("usageMonths", num(e.target.value))} placeholder="e.g. 12" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            Paid advertising usage <Switch checked={s.paidAds} onCheckedChange={(v) => set("paidAds", v)} aria-label="Paid advertising usage" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            Raw / source files <Switch checked={s.rawFiles} onCheckedChange={(v) => set("rawFiles", v)} aria-label="Raw files" />
          </label>
        </div>
        <Field label="Exclusivity" htmlFor="excl">
          <NativeSelect value={s.exclusivity} onChange={(e) => set("exclusivity", e.target.value as ScopeDefaults["exclusivity"])}>
            <option value="none">None</option>
            <option value="category">Category exclusivity</option>
            <option value="full">Full exclusivity</option>
          </NativeSelect>
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_110px]">
          <Field label="Budget from" htmlFor="bmin" optional>
            <Input inputMode="decimal" value={s.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} placeholder="e.g. 500" />
          </Field>
          <Field label="Budget up to" htmlFor="bmax" optional>
            <Input inputMode="decimal" value={s.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} placeholder="e.g. 1500" />
          </Field>
          <Field label="Currency" htmlFor="cur">
            <NativeSelect value={s.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </section>

      <aside className="grid content-start gap-4" aria-live="polite">
        <div className="on-dark rounded-2xl bg-forest p-5 text-ivory">
          <p className="text-xs tracking-[0.14em] text-ivory/60 uppercase">Estimated range</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatMoney(analysis.lowCents, s.currency)} – {formatMoney(analysis.highCents, s.currency)}
          </p>
          <p className="mt-1 text-xs text-ivory/60">
            Base {formatMoney(analysis.baseCents, s.currency)} · {analysis.totalUpliftPct >= 0 ? "+" : ""}
            {analysis.totalUpliftPct}% from cost drivers
          </p>
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm",
              analysis.budgetComparison.status === "below" ? "bg-[#fdf3dc] text-[#8a5a00]" : analysis.budgetComparison.status === "unknown" ? "bg-white/10" : "bg-lime text-forest",
            )}
          >
            {analysis.budgetComparison.message}
          </p>
          <p className="mt-3 text-[11px] text-ivory/60">{analysis.disclaimer}</p>
          {rates && !ratesApply ? <p className="mt-2 text-[11px] text-ivory/60">{rates.name}&apos;s rates are in {rates.currency}, so they aren&apos;t used for {s.currency}.</p> : null}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-sm">
          <p className="font-medium">Cost drivers</p>
          {analysis.drivers.length ? (
            <ul className="mt-2 grid gap-2">
              {analysis.drivers.map((d) => (
                <li key={d.key}>
                  <div className="flex justify-between gap-2">
                    <span>{d.label}</span>
                    <span className="font-medium">+{Math.round(d.upliftPct)}%</span>
                  </div>
                  <p className="text-xs text-ink-muted">{d.explanation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ink-muted">No extra cost drivers in this scope.</p>
          )}
        </div>
        {analysis.missing.length ? (
          <div className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p className="font-medium">Missing requirements</p>
            <ul className="mt-2 grid list-disc gap-1 pl-5">{analysis.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : null}
        <div className="rounded-2xl border border-line bg-white p-5 text-sm">
          <p className="font-medium">Questions for negotiation</p>
          <ul className="mt-2 grid list-disc gap-1 pl-5">{analysis.questions.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-sm">
          <FormError message={aiError} />
          {ai ? (
            <div className="grid gap-2">
              <p className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-4" aria-hidden /> AI-assisted explanation
              </p>
              <p>{ai.explanation}</p>
              {ai.scopeGaps.length ? <ul className="list-disc pl-5">{ai.scopeGaps.map((g) => <li key={g}>{g}</li>)}</ul> : null}
              {ai.negotiationQuestions.length ? <ul className="list-disc pl-5 text-ink-muted">{ai.negotiationQuestions.map((g) => <li key={g}>{g}</li>)}</ul> : null}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              disabled={!aiReady || pending}
              title={aiReady ? undefined : "AI isn't configured on this site"}
              onClick={() =>
                start(async () => {
                  setAiError(null);
                  const r = await aiScopeExplanation({ scope: s, estimate: { low: analysis.lowCents / 100, high: analysis.highCents / 100, currency: s.currency, drivers: analysis.drivers, budget: analysis.budgetComparison, missing: analysis.missing } });
                  if (r.ok) setAi(r.data);
                  else setAiError(r.error);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {aiReady ? "Explain with AI" : "AI explanation unavailable"}
            </Button>
          )}
          <p className="mt-2 text-[11px] text-ink-muted">This tool never changes a quote or accepts anything on anyone&apos;s behalf.</p>
        </div>
      </aside>
    </div>
  );
}
