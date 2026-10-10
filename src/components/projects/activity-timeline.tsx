import { formatDateTime } from "@/lib/format";

const LABELS: Record<string, string> = {
  project_created: "Project created from the accepted proposal",
  proposal_accepted: "Proposal accepted",
  scope_agreed: "Scope confirmed",
  project_active: "Project became active",
  deliverable_submitted: "Deliverable submitted",
  deliverable_approved: "Deliverable approved",
  deliverable_revision_requested: "Revision requested",
  project_completed: "Project completed",
  project_cancelled: "Project cancelled",
  project_disputed: "Dispute raised",
  project_dispute_resolved: "Dispute resolved",
  rights_submitted: "Usage rights submitted for approval",
  rights_draft_saved: "Usage rights draft saved",
  rights_agreed: "Usage rights agreed",
  rights_disputed: "Usage rights disputed",
  review_submitted: "Review published",
};

type Entry = { id: number; action: string; actor_id: string | null; metadata: unknown; created_at: string };

export function ActivityTimeline({ entries, names }: { entries: Entry[]; names: Record<string, string> }) {
  if (!entries.length) return <p className="text-sm text-ink-muted">No activity yet.</p>;
  return (
    <ol className="relative grid gap-4 border-l border-line pl-5">
      {entries.map((e) => {
        const meta = (e.metadata ?? {}) as { version?: number; party?: string };
        return (
          <li key={e.id} className="relative">
            <span aria-hidden className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-ivory bg-forest" />
            <p className="text-sm">
              {LABELS[e.action] ?? e.action.replace(/_/g, " ")}
              {meta.version ? ` (v${meta.version})` : ""}
            </p>
            <p className="text-xs text-ink-muted">
              {e.actor_id ? names[e.actor_id] ?? "Member" : "System"} · {formatDateTime(e.created_at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
