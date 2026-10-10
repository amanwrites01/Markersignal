"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { scopeSchema, type ScopeInput } from "@/lib/validation/project";
import { agreeScope, updateScope } from "@/server/projects";
import { formatDate, formatMoney } from "@/lib/format";
import { ActionButton } from "./reason-dialog";

type Props = {
  projectId: string;
  role: "brand" | "creator";
  status: string;
  scopeSummary: string | null;
  startDate: string | null;
  dueDate: string | null;
  amountCents: number | null;
  currency: string;
  brandAgreedAt: string | null;
  creatorAgreedAt: string | null;
  brandName: string;
  creatorName: string;
};

export function ScopePanel(p: Props) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const editable = p.status === "awaiting_agreement";
  const mine = p.role === "brand" ? p.brandAgreedAt : p.creatorAgreedAt;

  const { form, submit, pending, formError } = useActionForm<ScopeInput>({
    schema: scopeSchema as never,
    defaultValues: { scopeSummary: p.scopeSummary ?? "", startDate: p.startDate ?? "", dueDate: p.dueDate ?? "" },
    action: (v) => updateScope(p.projectId, v),
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });
  const errors = form.formState.errors;

  return (
    <div className="grid gap-5">
      {editing ? (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <FormError message={formError} />
          <Field label="Scope summary" htmlFor="scopeSummary" hint="What will be delivered, how, and what's out of scope." error={errors.scopeSummary?.message}>
            <Textarea rows={6} placeholder="e.g. Two 30-second reels, one round of revisions each, raw footage not included." {...form.register("scopeSummary")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="startDate" optional error={errors.startDate?.message}>
              <Input type="date" {...form.register("startDate")} />
            </Field>
            <Field label="Due date" htmlFor="dueDate" optional error={errors.dueDate?.message}>
              <Input type="date" {...form.register("dueDate")} />
            </Field>
          </div>
          <p className="text-xs text-ink-muted">Saving a change resets both confirmations, so each side agrees to the same version.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <SubmitButton pending={pending}>Save scope</SubmitButton>
          </div>
        </form>
      ) : (
        <>
          <p className="prose-body whitespace-pre-line">{p.scopeSummary || <span className="text-ink-muted">No scope summary yet.</span>}</p>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-muted">Start</dt>
              <dd className="mt-0.5 font-medium">{formatDate(p.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Due</dt>
              <dd className="mt-0.5 font-medium">{formatDate(p.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Agreed amount</dt>
              <dd className="mt-0.5 font-medium">{p.amountCents != null ? formatMoney(p.amountCents, p.currency) : "—"}</dd>
              <dd className="text-[11px] text-ink-muted">Recorded amount — no payment is processed by MAKERSIGNAL.</dd>
            </div>
          </dl>
        </>
      )}

      {editable && !editing ? (
        <div className="grid gap-4 rounded-xl bg-secondary/60 p-4">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              { name: p.brandName, at: p.brandAgreedAt, label: "Brand" },
              { name: p.creatorName, at: p.creatorAgreedAt, label: "Creator" },
            ].map((x) => (
              <li key={x.label} className="flex items-center gap-2">
                {x.at ? <Check className="size-4 text-success" aria-hidden /> : <Clock className="size-4 text-warning" aria-hidden />}
                <span>
                  <span className="font-medium">{x.label}</span> ({x.name}): {x.at ? `confirmed ${formatDate(x.at)}` : "not yet confirmed"}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {!mine ? <ActionButton action={() => agreeScope(p.projectId)}>Confirm scope</ActionButton> : <p className="text-sm text-ink-muted">You&apos;ve confirmed. Waiting for the other party.</p>}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden /> Edit scope
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
