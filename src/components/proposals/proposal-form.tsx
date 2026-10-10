"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { proposalSchema, type ProposalInput } from "@/lib/validation/proposal";
import { CURRENCIES } from "@/lib/validation/common";
import { saveProposalDraft } from "@/server/proposals";
import { formatBudget, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Opt = { id: number; name: string };
export type SampleOption = { id: string; title: string; detail: string };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7 lg:grid-cols-[220px_1fr] lg:gap-10">
      <div>
        <h2 className="h-section">{title}</h2>
        {description ? <p className="meta mt-1">{description}</p> : null}
      </div>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

export function ProposalForm({
  proposalId,
  campaignId,
  initial,
  deliverableTypes,
  platforms,
  samples,
  campaign,
}: {
  proposalId: string | null;
  campaignId: string;
  initial: ProposalInput;
  deliverableTypes: Opt[];
  platforms: Opt[];
  samples: SampleOption[];
  campaign: { budgetMin: number | null; budgetMax: number | null; currency: string; deadline: string | null; revisionsExpected: number | null };
}) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<ProposalInput, { id: string }>({
    schema: proposalSchema as never,
    defaultValues: initial,
    action: (v) => saveProposalDraft(proposalId, campaignId, v),
    onSuccess: (data) => {
      router.push(`/creator/proposals/${data.id}`);
      router.refresh();
    },
  });
  const { register, control, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "deliverables" });
  const num = { setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)) };
  const approachLen = (watch("approach") ?? "").length;

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <FormError message={formError} />

      <Section title="Your approach" description="How you'd tackle this brief. Brands read this first.">
        <Field
          label="Approach"
          htmlFor="approach"
          hint={`${approachLen} characters · at least 30 needed to submit`}
          error={errors.approach?.message}
        >
          <Textarea
            rows={8}
            {...register("approach")}
            placeholder="Your concept, how you'd shoot or design it, why it suits this audience, and what you need from the brand."
          />
        </Field>
      </Section>

      <Section title="Deliverables" description="Prefilled from the brief. Adjust quantities or add line prices if helpful.">
        <ul className="grid gap-3">
          {fields.map((f, i) => (
            <li key={f.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1.4fr_1fr_80px_120px_auto] sm:items-start">
              <Field label="Type" htmlFor={`deliverables.${i}.deliverableTypeId`} error={errors.deliverables?.[i]?.deliverableTypeId?.message}>
                <NativeSelect {...register(`deliverables.${i}.deliverableTypeId` as const)}>
                  <option value="">Choose…</option>
                  {deliverableTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Platform" htmlFor={`deliverables.${i}.platformId`} optional>
                <NativeSelect {...register(`deliverables.${i}.platformId` as const, num)}>
                  <option value="">Any</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Qty" htmlFor={`deliverables.${i}.quantity`} error={errors.deliverables?.[i]?.quantity?.message}>
                <Input type="number" min={1} max={100} {...register(`deliverables.${i}.quantity` as const)} />
              </Field>
              <Field label="Line price" htmlFor={`deliverables.${i}.price`} optional error={errors.deliverables?.[i]?.price?.message}>
                <Input inputMode="decimal" placeholder="e.g. 450" {...register(`deliverables.${i}.price` as const)} />
              </Field>
              <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remove deliverable ${i + 1}`} onClick={() => remove(i)}>
                <Trash2 />
              </Button>
              <div className="sm:col-span-5">
                <Field label="Notes" htmlFor={`deliverables.${i}.description`} optional>
                  <Input {...register(`deliverables.${i}.description` as const)} placeholder="Length, format, what's included…" />
                </Field>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ deliverableTypeId: "" as unknown as number, platformId: null, quantity: 1, description: "", price: "" })}
          >
            <Plus aria-hidden /> Add deliverable
          </Button>
        </div>
      </Section>

      <Section
        title="Quote & timeline"
        description={`Brief: ${formatBudget(campaign.budgetMin, campaign.budgetMax, campaign.currency)} · deadline ${formatDate(campaign.deadline)}${campaign.revisionsExpected != null ? ` · ${campaign.revisionsExpected} revisions expected` : ""}`}
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
          <Field label="Total quote" htmlFor="quote" hint="Required to submit. Your price for the full scope above." error={errors.quote?.message}>
            <Input inputMode="decimal" placeholder="e.g. 900" {...register("quote")} />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <NativeSelect {...register("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Timeline (days)" htmlFor="timelineDays" optional error={errors.timelineDays?.message}>
            <Input type="number" min={1} max={365} placeholder="e.g. 10" {...register("timelineDays", num)} />
          </Field>
          <Field label="Delivery date" htmlFor="proposedDeliveryDate" optional error={errors.proposedDeliveryDate?.message}>
            <Input type="date" {...register("proposedDeliveryDate")} />
          </Field>
          <Field label="Revisions included" htmlFor="revisionsIncluded" optional error={errors.revisionsIncluded?.message}>
            <Input type="number" min={0} max={20} placeholder="e.g. 2" {...register("revisionsIncluded", num)} />
          </Field>
        </div>
        <Field label="Usage-rights notes" htmlFor="usageNotes" optional hint="Anything your quote assumes about usage, paid ads, exclusivity or raw files." error={errors.usageNotes?.message}>
          <Textarea rows={3} {...register("usageNotes")} placeholder="e.g. Quote covers 12 months organic use; paid ads would be an additional 30%." />
        </Field>
        <p className="text-xs text-ink-muted">Your quote is a proposal, not a payment. MAKERSIGNAL doesn&apos;t process or hold payments.</p>
      </Section>

      <Section title="Work samples" description="Attach up to 6 portfolio pieces most relevant to this brief.">
        {samples.length ? (
          <Controller
            control={control}
            name="portfolioItemIds"
            render={({ field }) => {
              const value: string[] = field.value ?? [];
              return (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {samples.map((s) => {
                    const on = value.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                            on ? "border-forest bg-lime-soft" : "border-line hover:border-forest/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 size-4 accent-[#14241c]"
                            checked={on}
                            disabled={!on && value.length >= 6}
                            onChange={() => field.onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])}
                          />
                          <span>
                            <span className="block font-medium">{s.title}</span>
                            <span className="block text-xs text-ink-muted">{s.detail}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              );
            }}
          />
        ) : (
          <p className="meta">You have no portfolio pieces yet. Add some from Portfolio to strengthen your proposal.</p>
        )}
        {errors.portfolioItemIds ? <p role="alert" className="text-xs text-danger">{String(errors.portfolioItemIds.message)}</p> : null}
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-ivory/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <p className="meta mr-auto hidden sm:block">Saving keeps this as a draft. You&apos;ll review and submit on the next screen.</p>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>Save draft</SubmitButton>
      </div>
    </form>
  );
}
