import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, FileSignature, Info, MessagesSquare } from "lucide-react";
import { PageHeader, Panel, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ScopePanel } from "./scope-panel";
import { MilestonesPanel } from "./milestones-panel";
import { DeliverablesPanel } from "./deliverables-panel";
import { CommentsPanel } from "./comments-panel";
import { ProjectActions } from "./project-actions";
import { ReviewPanel } from "./review-panel";
import { ActivityTimeline } from "./activity-timeline";
import { getProjectWorkspace } from "@/lib/data/projects";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/server";
import { RIGHTS_STATUS_LABEL } from "@/lib/validation/rights";
import { cn } from "@/lib/utils";

function nextStep(role: "brand" | "creator", status: string, d: { status: string }[], agreed: { mine: boolean; theirs: boolean }) {
  const count = (s: string) => d.filter((x) => x.status === s).length;
  switch (status) {
    case "awaiting_agreement":
      return agreed.mine
        ? { tone: "info", text: "You've confirmed the scope. Waiting for the other party to confirm before work starts." }
        : { tone: "action", text: "Review the scope, deliverables and usage rights, then confirm the scope to start the project." };
    case "active":
      if (role === "brand" && d.length && d.every((x) => x.status === "approved")) return { tone: "action", text: "Every deliverable is approved. Mark the project completed when you're ready." };
      return role === "creator"
        ? { tone: "action", text: d.length ? "Submit your first versions when they're ready." : "Add the deliverables you'll submit." }
        : { tone: "info", text: "Work is in progress. You'll be notified when versions are submitted." };
    case "in_review":
      return role === "brand"
        ? { tone: "action", text: `${count("submitted")} deliverable${count("submitted") === 1 ? " is" : "s are"} waiting for your review.` }
        : { tone: "info", text: "The brand is reviewing your latest submission." };
    case "revision_requested":
      return role === "creator"
        ? { tone: "action", text: `Revisions requested on ${count("revision_requested")} deliverable${count("revision_requested") === 1 ? "" : "s"}. Submit a new version.` }
        : { tone: "info", text: "Waiting for the creator's revised versions." };
    case "completed":
      return { tone: "done", text: "This project is completed. Leave a review below if you haven't yet." };
    case "cancelled":
      return { tone: "muted", text: "This project was cancelled. Records and versions stay available." };
    case "disputed":
      return { tone: "warn", text: "A dispute is open. Discuss it in messages, then resolve it to resume work." };
    default:
      return null;
  }
}

const BANNER = {
  action: "bg-lime-soft border-forest/15",
  info: "bg-white border-line",
  done: "bg-forest text-ivory border-forest",
  muted: "bg-secondary border-line",
  warn: "bg-warning-soft border-warning/20 text-warning",
} as const;

export async function ProjectWorkspace({ projectId, viewerId, role }: { projectId: string; viewerId: string; role: "brand" | "creator" }) {
  const ws = await getProjectWorkspace(projectId, viewerId);
  if (!ws || ws.role !== role) notFound();
  const { project: p, names } = ws;
  const supabase = await createClient();
  const [taxonomy, { data: conversation }] = await Promise.all([
    getTaxonomy(),
    supabase.from("conversations").select("id").eq("project_id", projectId).maybeSingle(),
  ]);
  const step = nextStep(role, p.status, ws.deliverables, {
    mine: Boolean(role === "brand" ? p.brand_agreed_at : p.creator_agreed_at),
    theirs: Boolean(role === "brand" ? p.creator_agreed_at : p.brand_agreed_at),
  });
  const counterpart = role === "brand" ? { name: names[p.creator_id], href: `/creators/${p.creator_profiles?.slug}` } : { name: names[p.brand_id], href: null };
  const open = !["completed", "cancelled"].includes(p.status);
  const allApproved = ws.deliverables.length > 0 && ws.deliverables.every((d) => d.status === "approved");

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {p.title} <StatusBadge status={p.status} />
          </span>
        }
        description={
          <>
            With{" "}
            {counterpart.href ? (
              <Link href={counterpart.href} className="font-medium text-forest underline-offset-4 hover:underline">
                {counterpart.name}
              </Link>
            ) : (
              <span className="font-medium text-forest">{counterpart.name}</span>
            )}{" "}
            · from the campaign “{p.campaigns?.title}”
          </>
        }
        actions={
          conversation ? (
            <Button asChild variant="outline">
              <Link href={`/messages/${conversation.id}`}>
                <MessagesSquare aria-hidden /> Messages
              </Link>
            </Button>
          ) : null
        }
      />

      {step ? (
        <div role="status" className={cn("mb-8 flex items-start gap-3 rounded-2xl border p-4 text-sm", BANNER[step.tone as keyof typeof BANNER])}>
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">Next step: </span>
            {step.text}
            {p.status_note && ["disputed", "cancelled"].includes(p.status) ? <span className="mt-1 block opacity-90">Note: {p.status_note}</span> : null}
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-8">
          <Panel>
            <h2 className="h-section mb-4">Scope</h2>
            <ScopePanel
              projectId={p.id}
              role={role}
              status={p.status}
              scopeSummary={p.scope_summary}
              startDate={p.start_date}
              dueDate={p.due_date}
              amountCents={p.agreed_amount_cents}
              currency={p.currency}
              brandAgreedAt={p.brand_agreed_at}
              creatorAgreedAt={p.creator_agreed_at}
              brandName={names[p.brand_id] ?? "Brand"}
              creatorName={names[p.creator_id] ?? "Creator"}
            />
          </Panel>

          <Section title="Deliverables" description="Every submission is kept as a numbered version. Approve or request a revision on the latest one.">
            <DeliverablesPanel
              projectId={p.id}
              role={role}
              projectStatus={p.status}
              deliverables={ws.deliverables}
              milestones={ws.milestones.map((m) => ({ id: m.id, title: m.title }))}
              deliverableTypes={taxonomy.deliverableTypes}
              platforms={taxonomy.platforms}
              names={names}
            />
          </Section>

          <Section title="Milestones" description="Checkpoints update automatically from their deliverables. Amounts are planning figures only.">
            <MilestonesPanel projectId={p.id} milestones={ws.milestones} currency={p.currency} editable={open} />
          </Section>

          {p.status === "completed" ? (
            <Section title="Reviews">
              <ReviewPanel projectId={p.id} role={role} reviews={ws.reviews} names={names} />
            </Section>
          ) : null}

          <Section title="Comments">
            <CommentsPanel projectId={p.id} comments={ws.comments} names={names} viewerId={viewerId} canComment={p.status !== "cancelled"} />
          </Section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow flex items-center gap-1.5">
              <FileSignature className="size-3.5" aria-hidden /> Rights Passport
            </p>
            {ws.rights.length ? (
              <ul className="mt-3 grid gap-2 text-sm">
                {ws.rights.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0">{r.title}</span>
                    <span className="shrink-0">
                      <StatusBadge status={r.effective_status ?? "draft"} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No usage-rights record yet.</p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={`/projects/${p.id}/rights`}>
                Open Rights Passport <ArrowRight aria-hidden />
              </Link>
            </Button>
            <p className="mt-2 text-[11px] text-ink-muted">
              {ws.rights.some((r) => r.effective_status === "agreed") ? "Terms agreed by both parties." : ws.rights.length ? `Status: ${RIGHTS_STATUS_LABEL[ws.rights[0]!.effective_status ?? "draft"]}.` : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow mb-3">Project actions</p>
            {open || p.status === "disputed" ? (
              <ProjectActions projectId={p.id} role={role} status={p.status} allApproved={allApproved} hasDeliverables={ws.deliverables.length > 0} />
            ) : (
              <p className="text-sm text-ink-muted">This project is closed.</p>
            )}
            {role === "brand" && open && !allApproved ? <p className="mt-3 text-xs text-ink-muted">Completing becomes available once every deliverable is approved.</p> : null}
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="eyebrow mb-4">Activity</p>
            <ActivityTimeline entries={ws.audit} names={names} />
          </div>
        </aside>
      </div>
    </>
  );
}
