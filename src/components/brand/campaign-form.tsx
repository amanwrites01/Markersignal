"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { ChipSelect } from "@/components/inputs/chip-select";
import { useActionForm } from "@/hooks/use-action-form";
import { campaignSchema, type CampaignInput } from "@/lib/validation/campaign";
import { CURRENCIES } from "@/lib/validation/common";
import { saveCampaign } from "@/server/campaigns";
import type { Taxonomy } from "@/lib/data/taxonomy";

export const EMPTY_CAMPAIGN: CampaignInput = {
  title: "",
  objective: "",
  description: "",
  productDescription: "",
  targetAudience: "",
  categoryId: null,
  industryId: null,
  budgetMin: "",
  budgetMax: "",
  currency: "USD",
  deadline: "",
  applicationDeadline: "",
  locationRequirement: "",
  revisionsExpected: 2,
  usageOrganic: true,
  usagePaidAds: false,
  usageDurationMonths: 12,
  usageTerritory: "Worldwide",
  exclusivityRequired: false,
  rawFilesRequired: false,
  usageNotes: "",
  visibility: "public",
  blindReview: false,
  aiAssisted: false,
  deliverables: [{ deliverableTypeId: "" as unknown as number, platformId: null, quantity: 1, description: "" }],
  platformIds: [],
  styleIds: [],
  skillIds: [],
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-line bg-white p-5 sm:p-7 lg:grid-cols-[240px_1fr] lg:gap-10">
      <div>
        <h2 className="h-section">{title}</h2>
        {description ? <p className="meta mt-1">{description}</p> : null}
      </div>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

export function CampaignForm({ id, initial, taxonomy, status }: { id: string | null; initial: CampaignInput; taxonomy: Taxonomy; status?: string }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<CampaignInput, { id: string }>({
    schema: campaignSchema as never,
    defaultValues: initial,
    action: (v) => saveCampaign(id, v),
    onSuccess: (data) => {
      router.push(`/brand/campaigns/${data.id}`);
      router.refresh();
    },
  });
  const { register, control, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "deliverables" });
  const num = { setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)) };

  const toggle = (name: "usageOrganic" | "usagePaidAds" | "exclusivityRequired" | "rawFilesRequired" | "blindReview", label: string, hint?: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-start justify-between gap-4 rounded-xl border border-line p-4">
          <span>
            <span className="block text-sm font-medium">{label}</span>
            {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
          </span>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label={label} />
        </label>
      )}
    />
  );

  const chips = (name: "platformIds" | "styleIds" | "skillIds", label: string, options: { id: number; name: string; description?: string | null }[], hint: string, max?: number) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{label}</legend>
          <p className="-mt-1 text-xs text-ink-muted">{hint}</p>
          <ChipSelect label={label} options={options} value={(field.value as number[]) ?? []} onChange={field.onChange} max={max} />
          {errors[name] ? <p role="alert" className="text-xs text-danger">{String(errors[name]?.message)}</p> : null}
        </fieldset>
      )}
    />
  );

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      {initial.aiAssisted ? (
        <div className="flex items-start gap-3 rounded-2xl border border-forest/15 bg-lime-soft p-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Parts of this brief were drafted with AI assistance. Review and edit everything — nothing is published until you choose Publish on the
            next screen.
          </p>
        </div>
      ) : null}
      <FormError message={formError} />

      <Section title="The brief" description="What you want to achieve and for whom.">
        <Field label="Campaign title" htmlFor="title" error={errors.title?.message}>
          <Input {...register("title")} placeholder="e.g. Spring skincare launch — short-form product films" />
        </Field>
        <Field label="Objective" htmlFor="objective" hint="Required to publish. What should this content do?" error={errors.objective?.message}>
          <Textarea rows={3} {...register("objective")} placeholder="e.g. Introduce our new serum to people with sensitive skin." />
        </Field>
        <Field label="Description" htmlFor="description" optional hint="Creative direction, must-haves, things to avoid." error={errors.description?.message}>
          <Textarea rows={6} {...register("description")} placeholder="Tone, key messages, mandatory shots, and anything to avoid." />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product or service" htmlFor="productDescription" optional error={errors.productDescription?.message}>
            <Textarea rows={3} {...register("productDescription")} placeholder="What it is, key features, price point." />
          </Field>
          <Field label="Target audience" htmlFor="targetAudience" optional error={errors.targetAudience?.message}>
            <Textarea rows={3} {...register("targetAudience")} placeholder="e.g. 25–40, urban, sensitive skin, prefers simple routines." />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Creator category" htmlFor="categoryId" optional>
            <NativeSelect {...register("categoryId", num)}>
              <option value="">Any</option>
              {taxonomy.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Industry" htmlFor="industryId" optional>
            <NativeSelect {...register("industryId", num)}>
              <option value="">—</option>
              {taxonomy.industries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Section>

      <Section title="Deliverables" description="Be specific. At least one deliverable is required to publish.">
        <ul className="grid gap-3">
          {fields.map((f, i) => (
            <li key={f.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1.4fr_1fr_90px_auto] sm:items-start">
              <Field label="Type" htmlFor={`deliverables.${i}.deliverableTypeId`} error={errors.deliverables?.[i]?.deliverableTypeId?.message}>
                <NativeSelect {...register(`deliverables.${i}.deliverableTypeId` as const)}>
                  <option value="">Choose…</option>
                  {taxonomy.deliverableTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Platform" htmlFor={`deliverables.${i}.platformId`} optional>
                <NativeSelect {...register(`deliverables.${i}.platformId` as const, num)}>
                  <option value="">Any</option>
                  {taxonomy.platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Qty" htmlFor={`deliverables.${i}.quantity`} error={errors.deliverables?.[i]?.quantity?.message}>
                <Input type="number" min={1} max={100} {...register(`deliverables.${i}.quantity` as const)} />
              </Field>
              <Button type="button" variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remove deliverable ${i + 1}`} onClick={() => remove(i)}>
                <Trash2 />
              </Button>
              <div className="sm:col-span-4">
                <Field label="Notes" htmlFor={`deliverables.${i}.description`} optional>
                  <Input {...register(`deliverables.${i}.description` as const)} placeholder="Length, format, hooks, mandatory shots…" />
                </Field>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ deliverableTypeId: "" as unknown as number, platformId: null, quantity: 1, description: "" })}>
            <Plus aria-hidden /> Add deliverable
          </Button>
        </div>
        {chips("platformIds", "Platforms", taxonomy.platforms, "Where the content will run.")}
      </Section>

      <Section title="Creative DNA" description="The style and skills you're looking for. Matching uses these.">
        {chips("styleIds", "Desired creative style", taxonomy.styles, "Up to 5.", 5)}
        {chips("skillIds", "Required skills", taxonomy.skills, "Skills creators should be able to show work for.")}
      </Section>

      <Section title="Budget & timeline" description="A budget and a future deadline are required to publish.">
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_120px]">
          <Field label="Budget from" htmlFor="budgetMin" optional error={errors.budgetMin?.message}>
            <Input inputMode="decimal" {...register("budgetMin")} placeholder="e.g. 1000" />
          </Field>
          <Field label="Budget up to" htmlFor="budgetMax" error={errors.budgetMax?.message}>
            <Input inputMode="decimal" {...register("budgetMax")} placeholder="e.g. 2500" />
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
          <Field label="Delivery deadline" htmlFor="deadline" error={errors.deadline?.message}>
            <Input type="date" {...register("deadline")} />
          </Field>
          <Field label="Applications close" htmlFor="applicationDeadline" optional error={errors.applicationDeadline?.message}>
            <Input type="date" {...register("applicationDeadline")} />
          </Field>
          <Field label="Revisions expected" htmlFor="revisionsExpected" optional error={errors.revisionsExpected?.message}>
            <Input type="number" min={0} max={20} {...register("revisionsExpected", num)} />
          </Field>
        </div>
        <Field label="Location requirement" htmlFor="locationRequirement" optional hint="Only if creators must be somewhere specific (e.g. on-site shoot in Berlin)." error={errors.locationRequirement?.message}>
          <Input {...register("locationRequirement")} placeholder="e.g. On-site in Mumbai" />
        </Field>
      </Section>

      <Section title="Usage rights expectations" description="Stated up front so quotes reflect them. Final terms are agreed in the project's Rights Passport.">
        <div className="grid gap-3 sm:grid-cols-2">
          {toggle("usageOrganic", "Organic social use", "Posting on owned channels.")}
          {toggle("usagePaidAds", "Paid advertising", "Whitelisting, boosted posts, paid placements.")}
          {toggle("exclusivityRequired", "Exclusivity", "Creator avoids competing brands for a period.")}
          {toggle("rawFilesRequired", "Raw files", "Unedited footage or source files delivered.")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Usage duration (months)" htmlFor="usageDurationMonths" optional error={errors.usageDurationMonths?.message}>
            <Input type="number" min={1} max={120} {...register("usageDurationMonths", num)} />
          </Field>
          <Field label="Territory" htmlFor="usageTerritory" optional error={errors.usageTerritory?.message}>
            <Input {...register("usageTerritory")} placeholder="e.g. Worldwide, or India only" />
          </Field>
        </div>
        <Field label="Other usage notes" htmlFor="usageNotes" optional error={errors.usageNotes?.message}>
          <Textarea rows={3} {...register("usageNotes")} placeholder="e.g. Brand may repost on its own channels for 12 months." />
        </Field>
        <p className="text-xs text-ink-muted">AI-training permission is never assumed. It can only be granted explicitly in a Rights Passport.</p>
      </Section>

      <Section title="Visibility & review">
        <Field
          label="Who can see this campaign"
          htmlFor="visibility"
          hint={
            watch("visibility") === "invite_only"
              ? "Only creators you invite can see it."
              : watch("visibility") === "members"
                ? "Only signed-in members can see it."
                : "Listed publicly in Explore Campaigns."
          }
        >
          <NativeSelect {...register("visibility")}>
            <option value="public">Public</option>
            <option value="members">Members only</option>
            <option value="invite_only">Invite only</option>
          </NativeSelect>
        </Field>
        {toggle(
          "blindReview",
          "Blind Brief Room",
          "Review proposals without creator names, photos or profile links first, then reveal. Portfolio samples may still make a creator recognisable.",
        )}
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-ivory/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <p className="meta mr-auto hidden sm:block">{status && status !== "draft" ? "Changes apply to the live campaign." : "Saved as a draft. You'll publish from the next screen."}</p>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>{id ? "Save campaign" : "Save draft"}</SubmitButton>
      </div>
    </form>
  );
}
