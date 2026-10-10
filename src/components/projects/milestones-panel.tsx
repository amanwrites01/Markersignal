"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useActionForm } from "@/hooks/use-action-form";
import { milestoneSchema, type MilestoneInput } from "@/lib/validation/project";
import { deleteMilestone, saveMilestone } from "@/server/projects";
import { deadlineLabel, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionButton } from "./reason-dialog";

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  amount_cents: number | null;
  percentage: number | null;
  status: string;
};

const TONE = { overdue: "text-danger", soon: "text-warning", normal: "text-ink-muted" } as const;

export function MilestonesPanel({ projectId, milestones, currency, editable }: { projectId: string; milestones: Milestone[]; currency: string; editable: boolean }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="grid gap-3">
      {milestones.length === 0 && editing !== "new" ? (
        <EmptyState title="No milestones yet" description="Break the work into checkpoints with due dates. Amounts here are for planning only." />
      ) : null}
      <ol className="grid gap-3">
        {milestones.map((m, i) =>
          editing === m.id ? (
            <li key={m.id}>
              <MilestoneForm projectId={projectId} milestone={m} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={m.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-line p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest text-xs font-semibold text-lime">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{m.title}</p>
                  <StatusBadge status={m.status} />
                </div>
                {m.description ? <p className="mt-1 text-sm text-ink-muted">{m.description}</p> : null}
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  {m.status !== "approved" && deadlineLabel(m.due_date) ? (
                    <span className={cn(TONE[deadlineLabel(m.due_date)!.tone])}>{deadlineLabel(m.due_date)!.label}</span>
                  ) : null}
                  {m.amount_cents != null || m.percentage != null ? (
                    <span className="text-ink-muted">
                      Planned allocation: {[m.amount_cents != null ? formatMoney(m.amount_cents, currency) : null, m.percentage != null ? `${m.percentage}%` : null].filter(Boolean).join(" · ")} (not a payment)
                    </span>
                  ) : null}
                </p>
              </div>
              {editable && m.status !== "approved" ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(m.id)}>
                    <Pencil aria-hidden /> Edit
                  </Button>
                  {m.status === "pending" ? (
                    <ActionButton variant="ghost" size="sm" className="text-danger hover:text-danger" action={() => deleteMilestone(projectId, m.id)}>
                      <Trash2 aria-hidden /> Remove
                    </ActionButton>
                  ) : null}
                </div>
              ) : null}
            </li>
          ),
        )}
      </ol>
      {editable ? (
        editing === "new" ? (
          <MilestoneForm projectId={projectId} onDone={() => setEditing(null)} />
        ) : (
          <div>
            <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
              <Plus aria-hidden /> Add milestone
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

function MilestoneForm({ projectId, milestone, onDone }: { projectId: string; milestone?: Milestone; onDone: () => void }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<MilestoneInput>({
    schema: milestoneSchema as never,
    defaultValues: {
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      dueDate: milestone?.due_date ?? "",
      amount: milestone?.amount_cents != null ? String(milestone.amount_cents / 100) : "",
      percentage: milestone?.percentage != null ? String(milestone.percentage) : "",
    },
    action: (v) => saveMilestone(projectId, milestone?.id ?? null, v),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-forest/20 bg-secondary/40 p-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Milestone" htmlFor="m-title" error={errors.title?.message}>
          <Input placeholder="e.g. First cut of both reels" {...form.register("title")} />
        </Field>
        <Field label="Due date" htmlFor="m-due" optional error={errors.dueDate?.message}>
          <Input type="date" {...form.register("dueDate")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="m-desc" optional error={errors.description?.message}>
        <Textarea rows={2} placeholder="What counts as done for this milestone." {...form.register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Planned amount" htmlFor="m-amount" optional hint="For planning only — no payment is processed." error={errors.amount?.message}>
          <Input inputMode="decimal" placeholder="e.g. 450" {...form.register("amount")} />
        </Field>
        <Field label="Or percentage" htmlFor="m-pct" optional error={errors.percentage?.message}>
          <Input inputMode="decimal" placeholder="e.g. 50" {...form.register("percentage")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>{milestone ? "Save milestone" : "Add milestone"}</SubmitButton>
      </div>
    </form>
  );
}
