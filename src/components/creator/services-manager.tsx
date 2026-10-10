"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { EmptyState } from "@/components/empty-state";
import { useActionForm } from "@/hooks/use-action-form";
import { serviceSchema, type ServiceInput } from "@/lib/validation/creator";
import { CURRENCIES } from "@/lib/validation/common";
import { deleteService, saveService } from "@/server/creator";
import { formatMoney } from "@/lib/format";
import type { Option } from "@/lib/data/taxonomy";

export type Service = {
  id: string;
  title: string;
  description: string | null;
  deliverable_type_id: number | null;
  starting_price_cents: number | null;
  currency: string;
  turnaround_days: number | null;
  revisions_included: number | null;
  active: boolean;
};

export function ServicesManager({ services, deliverableTypes }: { services: Service[]; deliverableTypes: Option[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-3">
      {services.length === 0 && editing !== "new" ? (
        <EmptyState title="No services yet" description="Services tell brands what you offer and from what price. Scope-to-Price uses them as your reference rates." />
      ) : null}
      {services.map((s) =>
        editing === s.id ? (
          <ServiceForm key={s.id} service={s} deliverableTypes={deliverableTypes} onDone={() => setEditing(null)} />
        ) : (
          <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4">
            <div className="min-w-0">
              <p className="font-medium">
                {s.title} {!s.active ? <span className="ml-1 text-xs font-normal text-ink-muted">(hidden)</span> : null}
              </p>
              <p className="text-sm text-ink-muted">
                {[
                  s.starting_price_cents != null ? `from ${formatMoney(s.starting_price_cents, s.currency)}` : null,
                  s.turnaround_days ? `${s.turnaround_days}-day turnaround` : null,
                  s.revisions_included != null ? `${s.revisions_included} revision${s.revisions_included === 1 ? "" : "s"}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(s.id)}>
                <Pencil aria-hidden /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteService(s.id);
                    if (r.ok) {
                      toast.success(r.message);
                      router.refresh();
                    } else toast.error(r.error);
                  })
                }
              >
                <Trash2 aria-hidden /> Remove
              </Button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <ServiceForm deliverableTypes={deliverableTypes} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <Button variant="outline" onClick={() => setEditing("new")}>
            <Plus aria-hidden /> Add service
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ service, deliverableTypes, onDone }: { service?: Service; deliverableTypes: Option[]; onDone: () => void }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<ServiceInput, { id: string }>({
    schema: serviceSchema as never,
    defaultValues: {
      title: service?.title ?? "",
      description: service?.description ?? "",
      deliverableTypeId: service?.deliverable_type_id ?? null,
      startingPrice: service?.starting_price_cents != null ? String(service.starting_price_cents / 100) : "",
      currency: (service?.currency as "USD") ?? "USD",
      turnaroundDays: service?.turnaround_days ?? null,
      revisionsIncluded: service?.revisions_included ?? null,
      active: service?.active ?? true,
    },
    action: (v) => saveService(service?.id ?? null, v),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const { register, watch, setValue, formState: { errors } } = form;
  const num = { setValueAs: (v: string) => (v === "" || v == null ? null : Number(v)) };
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-forest/20 bg-secondary/40 p-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" htmlFor="svc-title" error={errors.title?.message}>
          <Input {...register("title")} placeholder="e.g. 3 short-form product videos" />
        </Field>
        <Field label="Deliverable type" htmlFor="svc-type" optional>
          <NativeSelect {...register("deliverableTypeId", num)}>
            <option value="">—</option>
            {deliverableTypes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="What's included" htmlFor="svc-desc" optional error={errors.description?.message}>
        <Textarea rows={3} {...register("description")} placeholder="Scripting, filming, editing, captions…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="From price" htmlFor="svc-price" optional error={errors.startingPrice?.message}>
          <Input inputMode="decimal" {...register("startingPrice")} placeholder="e.g. 900" />
        </Field>
        <Field label="Currency" htmlFor="svc-currency">
          <NativeSelect {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Turnaround (days)" htmlFor="svc-days" optional error={errors.turnaroundDays?.message}>
          <Input type="number" min={1} max={365} {...register("turnaroundDays", num)} />
        </Field>
        <Field label="Revisions" htmlFor="svc-rev" optional error={errors.revisionsIncluded?.message}>
          <Input type="number" min={0} max={20} {...register("revisionsIncluded", num)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} /> Show on my profile
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>Save service</SubmitButton>
      </div>
    </form>
  );
}
