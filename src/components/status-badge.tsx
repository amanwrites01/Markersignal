import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
  pending: "Pending",
  declined: "Declined",
  awaiting_agreement: "Awaiting agreement",
  active: "Active",
  in_review: "In review",
  revision_requested: "Revision requested",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  not_started: "Not started",
  in_progress: "In progress",
  approved: "Approved",
  awaiting_creator: "Awaiting creator approval",
  awaiting_brand: "Awaiting brand approval",
  agreed: "Agreed",
  expired: "Expired",
  available: "Available",
  limited: "Limited availability",
  unavailable: "Unavailable",
};

const TONES: Record<string, string> = {
  positive: "bg-lime-soft text-forest ring-forest/10",
  neutral: "bg-secondary text-forest ring-forest/10",
  attention: "bg-warning-soft text-warning ring-warning/15",
  negative: "bg-danger-soft text-danger ring-danger/15",
  strong: "bg-forest text-ivory ring-forest",
};

const TONE_OF: Record<string, keyof typeof TONES> = {
  published: "positive", accepted: "positive", active: "positive", approved: "positive", agreed: "positive",
  completed: "strong", available: "positive",
  submitted: "attention", under_review: "attention", pending: "attention", awaiting_agreement: "attention",
  in_review: "attention", awaiting_creator: "attention", awaiting_brand: "attention", revision_requested: "attention",
  limited: "attention", paused: "attention",
  rejected: "negative", cancelled: "negative", disputed: "negative", expired: "negative", unavailable: "negative",
};

export function statusLabel(status: string) {
  return LABELS[status] ?? status.replace(/_/g, " ");
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[TONE_OF[status] ?? "neutral"],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(status)}
    </span>
  );
}
