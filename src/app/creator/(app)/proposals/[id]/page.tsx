import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, EyeOff, FolderKanban } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { CreatorProposalActions } from "@/components/proposals/creator-proposal-actions";
import { requireRole } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { campaignAcceptsProposals, getOwnProposal, getSampleOptions, proposalToInput } from "@/lib/data/proposals";
import { submitProblems } from "@/lib/validation/proposal";
import { formatBudget, formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Proposal" };

export default async function CreatorProposalPage({ params, searchParams }: PageProps<"/creator/proposals/[id]">) {
  const viewer = await requireRole("creator");
  const { id } = await params;
  const edit = (await searchParams).edit === "1";
  const data = await getOwnProposal(id);
  if (!data || data.proposal.creator_id !== viewer.id) notFound();
  const p = data.proposal;
  const c = p.campaigns!;
  const accepts = campaignAcceptsProposals(c);
  const problems = submitProblems({ approach: p.approach, quote: p.quote_cents, deliverableCount: data.deliverables.length });
  const blindLocked = c.blind_review && !p.identity_revealed;
  const canMessage = p.status !== "draft" && !blindLocked;

  if (edit && p.status === "draft") {
    const [taxonomy, samples] = await Promise.all([getTaxonomy(), getSampleOptions(viewer.id)]);
    return (
      <>
        <PageHeader eyebrow="Edit draft" title={c.title} />
        <ProposalForm
          proposalId={p.id}
          campaignId={c.id}
          initial={proposalToInput(data)}
          deliverableTypes={taxonomy.deliverableTypes}
          platforms={taxonomy.platforms}
          samples={samples}
          campaign={{ budgetMin: c.budget_min_cents, budgetMax: c.budget_max_cents, currency: c.currency, deadline: c.deadline, revisionsExpected: c.revisions_expected }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`Proposal · ${c.brand_profiles?.brand_name ?? "Brand"}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.title} <StatusBadge status={p.status} />
          </span>
        }
        description={p.submitted_at ? `Submitted ${formatDateTime(p.submitted_at)}` : "Draft — the brand can't see this yet."}
        actions={<CreatorProposalActions id={p.id} status={p.status} canSubmit={problems.length === 0} campaignOpen={accepts.open} canMessage={canMessage} />}
      />

      {p.status === "draft" && (problems.length || !accepts.open) ? (
        <div role="status" className="mb-6 rounded-2xl border border-warning/20 bg-warning-soft p-4 text-sm text-warning">
          <p className="font-medium">Before you can submit:</p>
          <ul className="mt-1 list-disc pl-5">
            {!accepts.open ? <li>{accepts.reason}</li> : null}
            {problems.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.projectId ? (
        <Link href={`/creator/projects/${data.projectId}`} className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-forest p-5 text-ivory">
          <span className="flex items-center gap-3">
            <FolderKanban className="size-5 text-lime" aria-hidden />
            <span>
              <span className="block font-medium">Accepted — your project is ready</span>
              <span className="block text-sm text-ivory/70">Confirm scope and usage rights to start work.</span>
            </span>
          </span>
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      ) : null}

      {p.decision_note && ["accepted", "rejected"].includes(p.status) ? (
        <Panel className="mb-6">
          <p className="eyebrow">Note from the brand</p>
          <p className="mt-2 whitespace-pre-line">{p.decision_note}</p>
        </Panel>
      ) : null}

      {blindLocked && p.status !== "draft" ? (
        <div className="mb-6 flex gap-3 rounded-2xl bg-secondary p-4 text-sm">
          <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            This campaign uses the Blind Brief Room. The brand sees your approach, quote, skills and attached samples, but not your name, photo or profile
            link until they choose to reveal it. Messaging opens once they do.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <h2 className="h-section">Approach</h2>
            <p className="prose-body mt-2 whitespace-pre-line">{p.approach || <span className="text-ink-muted">Not written yet.</span>}</p>
          </Panel>
          <Panel>
            <h2 className="h-section">Deliverables</h2>
            {data.deliverables.length ? (
              <ul className="mt-3 divide-y divide-line">
                {data.deliverables.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium">
                        {d.quantity} × {d.deliverable_types?.name}
                        <span className="font-normal text-ink-muted"> · {d.platforms?.name ?? "Any platform"}</span>
                      </p>
                      {d.description ? <p className="text-sm text-ink-muted">{d.description}</p> : null}
                    </div>
                    {d.price_cents != null ? <span className="text-sm">{formatMoney(d.price_cents, p.currency)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta mt-2">No deliverables listed.</p>
            )}
          </Panel>
          {p.usage_notes ? (
            <Panel>
              <h2 className="h-section">Usage-rights notes</h2>
              <p className="mt-2 whitespace-pre-line">{p.usage_notes}</p>
            </Panel>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow">Your quote</p>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(p.quote_cents, p.currency)}</p>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">Brief budget</dt>
                <dd>{formatBudget(c.budget_min_cents, c.budget_max_cents, c.currency)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">Timeline</dt>
                <dd>{p.timeline_days ? `${p.timeline_days} days` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">Delivery</dt>
                <dd>{formatDate(p.proposed_delivery_date)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">Brief deadline</dt>
                <dd>{formatDate(c.deadline)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-muted">Revisions</dt>
                <dd>{p.revisions_included ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-muted">A quote is a proposal, not a payment. No money is processed by MAKERSIGNAL.</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p className="eyebrow">Attached samples</p>
            {data.samples.length ? (
              <ul className="mt-2 grid gap-1">
                {data.samples.map((s) => (
                  <li key={s.portfolio_item_id}>{s.portfolio_items?.title}</li>
                ))}
              </ul>
            ) : (
              <p className="meta mt-2">None attached.</p>
            )}
          </div>
          <Button asChild variant="ghost" className="w-full">
            <Link href={`/campaigns/${c.id}`}>View the brief</Link>
          </Button>
        </aside>
      </div>
    </>
  );
}
