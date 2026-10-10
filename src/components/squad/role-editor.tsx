"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { ChipSelect } from "@/components/inputs/chip-select";
import { useActionForm } from "@/hooks/use-action-form";
import { deleteSquadRole, saveSquadRole } from "@/server/squad";
import { squadRoleSchema } from "@/lib/validation/squad";
import { aiSquadPlan } from "@/server/ai";
import type { Taxonomy } from "@/lib/data/taxonomy";
import type { z } from "zod";

type RoleInput = z.input<typeof squadRoleSchema>;
export type RoleData = { id: string; title: string; description: string | null; category_id: number | null; deliverable_type_id: number | null; budget_cents: number | null; headcount: number; skillIds: number[] };

const toInput = (r?: RoleData): RoleInput => ({
  title: r?.title ?? "",
  description: r?.description ?? "",
  categoryId: r?.category_id ?? null,
  deliverableTypeId: r?.deliverable_type_id ?? null,
  budget: r?.budget_cents != null ? String(r.budget_cents / 100) : "",
  headcount: r?.headcount ?? 1,
  skillIds: r?.skillIds ?? [],
});

export function RoleDialogButton({ campaignId, taxonomy, role, preset, label }: { campaignId: string; taxonomy: Taxonomy; role?: RoleData; preset?: RoleInput; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={role ? "ghost" : preset ? "outline" : "default"} size="sm" onClick={() => setOpen(true)}>
        {role ? <Pencil aria-hidden /> : <Plus aria-hidden />}
        {label ?? (role ? "Edit" : "Add role")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{role ? "Edit role" : "Add role"}</DialogTitle>
            <DialogDescription>Roles describe who you need. Creators are only added when they accept an invitation.</DialogDescription>
          </DialogHeader>
          {open ? <RoleForm campaignId={campaignId} taxonomy={taxonomy} role={role} initial={preset ?? toInput(role)} onDone={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoleForm({ campaignId, taxonomy, role, initial, onDone }: { campaignId: string; taxonomy: Taxonomy; role?: RoleData; initial: RoleInput; onDone: () => void }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<RoleInput, { id: string }>({
    schema: squadRoleSchema as never,
    defaultValues: initial,
    action: (v) => saveSquadRole(campaignId, role?.id ?? null, v),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const { register, control, formState: { errors } } = form;
  const num = { setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)) };
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <Field label="Role title" htmlFor="role-title" error={errors.title?.message}>
        <Input {...register("title")} placeholder="e.g. Lead video creator" />
      </Field>
      <Field label="What this role does" htmlFor="role-desc" optional>
        <Textarea rows={3} {...register("description")} placeholder="Responsibilities and deliverables for this person." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="role-cat" optional>
          <NativeSelect {...register("categoryId", num)}>
            <option value="">Any</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Main deliverable" htmlFor="role-type" optional>
          <NativeSelect {...register("deliverableTypeId", num)}>
            <option value="">—</option>
            {taxonomy.deliverableTypes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Budget per person" htmlFor="role-budget" optional error={errors.budget?.message}>
          <Input inputMode="decimal" {...register("budget")} placeholder="e.g. 800" />
        </Field>
        <Field label="People needed" htmlFor="role-count" error={errors.headcount?.message}>
          <Input type="number" min={1} max={20} {...register("headcount")} />
        </Field>
      </div>
      <Controller
        control={control}
        name="skillIds"
        render={({ field }) => (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Skills</legend>
            <ChipSelect label="Skills" options={taxonomy.skills} value={(field.value as number[]) ?? []} onChange={field.onChange} />
          </fieldset>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <SubmitButton pending={pending}>Save role</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteRoleButton({ campaignId, roleId }: { campaignId: string; roleId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-danger hover:text-danger"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await deleteSquadRole(campaignId, roleId);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <Trash2 aria-hidden /> Remove
    </Button>
  );
}

export function AiSquadSuggestions({ campaignId, taxonomy, aiReady, campaignBudgetCents }: { campaignId: string; taxonomy: Taxonomy; aiReady: boolean; campaignBudgetCents: number | null }) {
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof aiSquadPlan>> | null>(null);
  const id = (list: { id: number; slug: string }[], slug: string | null) => (slug ? list.find((x) => x.slug === slug)?.id ?? null : null);
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="size-4" aria-hidden /> Suggest roles with AI
          </p>
          <p className="meta">AI-assisted suggestions you can add, edit or ignore.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!aiReady || pending}
          title={aiReady ? undefined : "AI isn't configured on this site"}
          onClick={() => start(async () => setPlan(await aiSquadPlan(campaignId)))}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {aiReady ? "Suggest roles" : "AI unavailable"}
        </Button>
      </div>
      {plan && !plan.ok ? <p className="mt-3 text-sm text-danger">{plan.error}</p> : null}
      {plan?.ok ? (
        <ul className="mt-4 grid gap-3">
          {plan.data.roles.map((r, i) => (
            <li key={i} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4">
              <div className="min-w-0">
                <p className="font-medium">{r.title} <span className="text-xs font-normal text-ink-muted">· ~{r.budgetSharePercent}% of budget</span></p>
                <p className="mt-0.5 text-sm text-ink-muted">{r.why}</p>
              </div>
              <RoleDialogButton
                campaignId={campaignId}
                taxonomy={taxonomy}
                label="Add this role"
                preset={{
                  title: r.title,
                  description: r.why,
                  categoryId: id(taxonomy.categories, r.category),
                  deliverableTypeId: id(taxonomy.deliverableTypes, r.deliverableType),
                  budget: campaignBudgetCents != null ? String(Math.round((campaignBudgetCents / 100) * (r.budgetSharePercent / 100))) : "",
                  headcount: 1,
                  skillIds: r.skills.map((s) => id(taxonomy.skills, s)).filter((x): x is number => x != null),
                }}
              />
            </li>
          ))}
          {plan.data.notes.length ? <li className="text-sm text-ink-muted">{plan.data.notes.join(" ")}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
