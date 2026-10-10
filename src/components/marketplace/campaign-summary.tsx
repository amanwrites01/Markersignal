import { CalendarDays, Check, EyeOff, MapPin, Minus, RefreshCw } from "lucide-react";
import type { CampaignDetail } from "@/lib/data/campaigns";
import { formatBudget, formatDate } from "@/lib/format";

function Yes({ on, label }: { on: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {on ? <Check className="size-4 text-success" aria-hidden /> : <Minus className="size-4 text-gray-brand" aria-hidden />}
      <span className={on ? "" : "text-ink-muted"}>{label}</span>
      <span className="sr-only">{on ? "yes" : "no"}</span>
    </li>
  );
}

export function CampaignSummary({ detail }: { detail: CampaignDetail }) {
  const c = detail.campaign;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-8">
        {c.objective ? (
          <section>
            <h2 className="h-section">Objective</h2>
            <p className="prose-body mt-2 whitespace-pre-line">{c.objective}</p>
          </section>
        ) : null}
        {c.description ? (
          <section>
            <h2 className="h-section">Brief</h2>
            <p className="prose-body mt-2 whitespace-pre-line">{c.description}</p>
          </section>
        ) : null}
        <div className="grid gap-8 sm:grid-cols-2">
          {c.product_description ? (
            <section>
              <h2 className="h-section">Product or service</h2>
              <p className="mt-2 text-[15px] leading-7 whitespace-pre-line">{c.product_description}</p>
            </section>
          ) : null}
          {c.target_audience ? (
            <section>
              <h2 className="h-section">Target audience</h2>
              <p className="mt-2 text-[15px] leading-7 whitespace-pre-line">{c.target_audience}</p>
            </section>
          ) : null}
        </div>
        <section>
          <h2 className="h-section">Deliverables</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {detail.deliverables.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">
                    {d.quantity} × {d.deliverable_types?.name}
                  </p>
                  {d.description ? <p className="mt-0.5 text-sm text-ink-muted">{d.description}</p> : null}
                </div>
                <span className="text-sm text-ink-muted">{d.platforms?.name ?? "Any platform"}</span>
              </li>
            ))}
            {detail.deliverables.length === 0 ? <li className="p-4 text-sm text-ink-muted">No deliverables yet.</li> : null}
          </ul>
        </section>
        <section>
          <h2 className="h-section">Usage rights expectations</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <Yes on={c.usage_organic} label="Organic social use" />
            <Yes on={c.usage_paid_ads} label="Paid advertising" />
            <Yes on={c.exclusivity_required} label="Exclusivity requested" />
            <Yes on={c.raw_files_required} label="Raw files requested" />
          </ul>
          <p className="mt-3 text-sm text-ink-muted">
            {c.usage_duration_months ? `${c.usage_duration_months} months` : "Duration to be agreed"} · {c.usage_territory ?? "Territory to be agreed"}
          </p>
          {c.usage_notes ? <p className="mt-2 text-sm whitespace-pre-line">{c.usage_notes}</p> : null}
          <p className="mt-3 text-xs text-ink-muted">
            These are the brand&apos;s stated expectations. The final terms are recorded and approved by both parties in the project&apos;s Rights
            Passport. AI-training use is never included unless explicitly agreed there.
          </p>
        </section>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="eyebrow">Budget</p>
          <p className="mt-1 text-2xl font-semibold">{formatBudget(c.budget_min_cents, c.budget_max_cents, c.currency)}</p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                <CalendarDays className="size-4" aria-hidden /> Deadline
              </dt>
              <dd>{formatDate(c.deadline)}</dd>
            </div>
            {c.application_deadline ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Applications close</dt>
                <dd>{formatDate(c.application_deadline)}</dd>
              </div>
            ) : null}
            {c.revisions_expected != null ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <RefreshCw className="size-4" aria-hidden /> Revisions
                </dt>
                <dd>{c.revisions_expected}</dd>
              </div>
            ) : null}
            {c.location_requirement ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-ink-muted">
                  <MapPin className="size-4" aria-hidden /> Location
                </dt>
                <dd className="text-right">{c.location_requirement}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-sm">
          <p className="eyebrow">Looking for</p>
          <dl className="mt-3 grid gap-3">
            <div>
              <dt className="text-xs text-ink-muted">Creative style</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {detail.styles.length
                  ? detail.styles.map((s) => (
                      <span key={s.style_tag_id} className="rounded-full bg-forest px-2.5 py-0.5 text-xs text-ivory">
                        {s.creative_style_tags?.name}
                      </span>
                    ))
                  : "Open"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Skills</dt>
              <dd className="mt-1">{detail.skills.map((s) => s.skills?.name).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Platforms</dt>
              <dd className="mt-1">{detail.platforms.map((p) => p.platforms?.name).join(", ") || "—"}</dd>
            </div>
            {c.creator_categories?.name ? (
              <div>
                <dt className="text-xs text-ink-muted">Category</dt>
                <dd className="mt-1">{c.creator_categories.name}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        {c.blind_review ? (
          <div className="flex gap-3 rounded-2xl bg-secondary p-4 text-sm">
            <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-medium">Blind Brief Room.</span> The brand first reviews proposals without your name, photo or profile link. Your
              portfolio samples are shown and may still identify you.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
