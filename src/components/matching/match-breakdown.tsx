import { cn } from "@/lib/utils";

export type StoredFactor = { key: string; label: string; weight: number; score: number | null; detail: string };
export type StoredFactors = { tier?: string; confidence?: string; items?: StoredFactor[] };

const TIER_STYLE: Record<string, string> = {
  strong: "bg-forest text-lime",
  good: "bg-lime text-forest",
  partial: "bg-secondary text-forest",
  weak: "bg-secondary text-ink-muted",
};

export function MatchScore({ score, tier }: { score: number; tier?: string }) {
  const t = tier ?? (score >= 75 ? "strong" : score >= 55 ? "good" : score >= 35 ? "partial" : "weak");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", TIER_STYLE[t])} title="Estimated match from profile and brief data">
      {t.charAt(0).toUpperCase() + t.slice(1)} · {score}
      <span className="sr-only"> out of 100, estimated</span>
    </span>
  );
}

export function MatchBreakdown({ factors, className }: { factors: StoredFactors; className?: string }) {
  const items = factors.items ?? [];
  return (
    <details className={cn("group text-sm", className)}>
      <summary className="cursor-pointer text-xs font-medium text-ink-muted underline-offset-4 hover:text-forest hover:underline">
        How this was estimated{factors.confidence ? ` · ${factors.confidence} confidence` : ""}
      </summary>
      <ul className="mt-3 grid gap-2.5">
        {items.map((f) => (
          <li key={f.key}>
            <div className="flex justify-between gap-3 text-xs">
              <span className="font-medium">{f.label}</span>
              <span className="text-ink-muted">{f.score == null ? "not scored" : `${Math.round(f.score * 100)}% · weight ${f.weight}`}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-secondary" aria-hidden>
              {f.score != null ? <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(3, f.score * 100)}%` }} /> : null}
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">{f.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-muted">
        Estimates use only profile and brief information. Factors without data are left out. No sensitive personal attributes are used.
      </p>
    </details>
  );
}
