import { formatMoney } from "@/lib/format";

export type Comparison = { label: string; detail: string; tone: "ok" | "warn" | "neutral" };

/** Deterministic, rule-based comparison of a proposal against its brief. */
export function compareProposal(
  p: { quote_cents: number | null; currency: string; proposed_delivery_date: string | null; revisions_included: number | null },
  c: { budget_min_cents: number | null; budget_max_cents: number | null; currency: string; deadline: string | null; revisions_expected: number | null },
): Comparison[] {
  const out: Comparison[] = [];
  if (p.quote_cents == null) out.push({ label: "Budget", detail: "No quote given", tone: "warn" });
  else if (p.currency !== c.currency) out.push({ label: "Budget", detail: `Quoted in ${p.currency}; brief budget is in ${c.currency}`, tone: "neutral" });
  else if (c.budget_max_cents != null && p.quote_cents > c.budget_max_cents) {
    const pct = Math.round(((p.quote_cents - c.budget_max_cents) / Math.max(c.budget_max_cents, 1)) * 100);
    out.push({ label: "Budget", detail: `${pct}% above your maximum (${formatMoney(c.budget_max_cents, c.currency)})`, tone: "warn" });
  } else if (c.budget_min_cents != null && p.quote_cents < c.budget_min_cents)
    out.push({ label: "Budget", detail: "Below your stated range — check the scope covers everything", tone: "neutral" });
  else out.push({ label: "Budget", detail: "Within your budget", tone: "ok" });

  if (!p.proposed_delivery_date || !c.deadline) out.push({ label: "Timing", detail: "No delivery date to compare", tone: "neutral" });
  else if (p.proposed_delivery_date > c.deadline) out.push({ label: "Timing", detail: "Delivers after your deadline", tone: "warn" });
  else out.push({ label: "Timing", detail: "Delivers on or before your deadline", tone: "ok" });

  if (p.revisions_included != null && c.revisions_expected != null)
    out.push(
      p.revisions_included >= c.revisions_expected
        ? { label: "Revisions", detail: `${p.revisions_included} included (you expect ${c.revisions_expected})`, tone: "ok" }
        : { label: "Revisions", detail: `${p.revisions_included} included — fewer than the ${c.revisions_expected} you expect`, tone: "warn" },
    );
  return out;
}
