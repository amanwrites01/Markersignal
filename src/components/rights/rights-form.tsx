"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { ChipSelect } from "@/components/inputs/chip-select";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rightsSchema, type RightsInput } from "@/lib/validation/rights";
import { saveRights } from "@/server/rights";

type Opt = { id: number | string; name: string };

export function RightsForm({
  projectId,
  recordId,
  initial,
  platforms,
  deliverables,
  onDone,
}: {
  projectId: string;
  recordId: string | null;
  initial: RightsInput;
  platforms: Opt[];
  deliverables: Opt[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const form = useForm<RightsInput>({ resolver: zodResolver(rightsSchema as never) as unknown as Resolver<RightsInput>, defaultValues: initial, mode: "onTouched" });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"draft" | "submit" | null>(null);
  const { register, control, formState: { errors } } = form;
  const paidAdsUse = useWatch({ control, name: "paidAdsUse" });
  const exclusivity = useWatch({ control, name: "exclusivity" });
  const rawFilesIncluded = useWatch({ control, name: "rawFilesIncluded" });
  const derivativeEditsAllowed = useWatch({ control, name: "derivativeEditsAllowed" });
  const attributionRequired = useWatch({ control, name: "attributionRequired" });

  const save = (submit: boolean) =>
    form.handleSubmit((values) => {
      setFormError(null);
      setMode(submit ? "submit" : "draft");
      start(async () => {
        const r = await saveRights(projectId, recordId, values, submit);
        setMode(null);
        if (r.ok) {
          toast.success(r.message);
          onDone?.();
          router.refresh();
        } else {
          setFormError(r.error);
          for (const [k, v] of Object.entries(r.fieldErrors ?? {})) if (v?.[0]) form.setError(k as keyof RightsInput, { message: v[0] });
        }
      });
    })();

  const toggle = (name: "organicUse" | "paidAdsUse" | "rawFilesIncluded" | "derivativeEditsAllowed" | "attributionRequired", label: string, hint: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-start justify-between gap-4 rounded-xl border border-line p-4">
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
          </span>
          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label={label} />
        </label>
      )}
    />
  );

  return (
    <form onSubmit={(e) => e.preventDefault()} className="grid gap-6" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Record title" htmlFor="title" error={errors.title?.message}>
          <Input placeholder="e.g. Usage rights — summer reels" {...register("title")} />
        </Field>
        <Field label="Applies to" htmlFor="deliverableId" optional>
          <NativeSelect {...register("deliverableId")}>
            <option value="">All project deliverables</option>
            {deliverables.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Content type" htmlFor="contentType" optional error={errors.contentType?.message}>
        <Input placeholder="e.g. Two 30-second vertical videos and stills" {...register("contentType")} />
      </Field>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Where it can be used</legend>
        <Controller
          control={control}
          name="platformIds"
          render={({ field }) => <ChipSelect label="Usage platforms" options={platforms} value={(field.value as number[]) ?? []} onChange={field.onChange} />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {toggle("organicUse", "Organic social use", "Posting on the brand's own channels.")}
          {toggle("paidAdsUse", "Paid advertising", "Boosted posts, whitelisting, paid placements.")}
        </div>
        {paidAdsUse ? (
          <Field label="Paid advertising details" htmlFor="paidAdsNotes" optional error={errors.paidAdsNotes?.message}>
            <Input placeholder="e.g. Meta and TikTok ads, max 3 months of spend" {...register("paidAdsNotes")} />
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium">Territory and duration</legend>
        <Field label="Territory" htmlFor="territory" error={errors.territory?.message}>
          <Input placeholder="e.g. Worldwide, or India only" {...register("territory")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="License start" htmlFor="licenseStart" optional error={errors.licenseStart?.message}>
            <Input type="date" {...register("licenseStart")} />
          </Field>
          <Field label="License end" htmlFor="licenseEnd" optional error={errors.licenseEnd?.message}>
            <Input type="date" {...register("licenseEnd")} />
          </Field>
          <Field label="Or duration (months)" htmlFor="durationMonths" optional error={errors.durationMonths?.message}>
            <Input type="number" min={1} max={240} placeholder="e.g. 12" {...register("durationMonths", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium">Exclusivity, files and edits</legend>
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <Field label="Exclusivity" htmlFor="exclusivity">
            <NativeSelect {...register("exclusivity")}>
              <option value="none">None</option>
              <option value="category">Category (no competing brands)</option>
              <option value="full">Full exclusivity</option>
            </NativeSelect>
          </Field>
          {exclusivity !== "none" ? (
            <Field label="What it covers" htmlFor="exclusivityDetails" error={errors.exclusivityDetails?.message}>
              <Input placeholder="e.g. No other skincare brands for 3 months after posting" {...register("exclusivityDetails")} />
            </Field>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {toggle("rawFilesIncluded", "Raw files delivered", "Unedited footage or source files go to the brand.")}
          {toggle("derivativeEditsAllowed", "Edits & derivative works", "The brand may re-cut, crop, translate or adapt the content.")}
        </div>
        {rawFilesIncluded ? (
          <Field label="Raw file details" htmlFor="rawFilesNotes" optional>
            <Input placeholder="e.g. All selects as ProRes, delivered via shared drive" {...register("rawFilesNotes")} />
          </Field>
        ) : null}
        {derivativeEditsAllowed ? (
          <Field label="Edit limits" htmlFor="derivativeNotes" optional>
            <Input placeholder="e.g. No changes to the creator's voice or likeness" {...register("derivativeNotes")} />
          </Field>
        ) : null}
      </fieldset>

      <Controller
        control={control}
        name="aiTrainingAllowed"
        render={({ field }) => (
          <div className="rounded-xl border-2 border-dashed border-forest/25 bg-secondary/40 p-4">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldAlert className="size-4" aria-hidden /> AI-training permission (separate opt-in)
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  Allows the brand to use this content to train or fine-tune AI models. Off unless both parties deliberately agree. It is never implied by
                  uploading, delivering or licensing content.
                </span>
              </span>
              <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label="Permit AI training" />
            </label>
          </div>
        )}
      />

      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium">Attribution and other terms</legend>
        {toggle("attributionRequired", "Attribution required", "The creator must be credited when the content is used.")}
        {attributionRequired ? (
          <Field label="How to credit" htmlFor="attributionDetails" optional>
            <Input placeholder="e.g. Tag @creator in the caption" {...register("attributionDetails")} />
          </Field>
        ) : null}
        <Field label="Additional agreed terms" htmlFor="additionalTerms" optional error={errors.additionalTerms?.message}>
          <Textarea rows={4} placeholder="Anything else both sides agreed, e.g. approval needed before using in TV." {...register("additionalTerms")} />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <p className="mr-auto text-xs text-ink-muted">Submitting counts as your approval of this version and asks the other party to approve it. Any later edit resets both approvals.</p>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" variant="outline" disabled={pending} onClick={() => save(false)}>
          {pending && mode === "draft" ? <Loader2 className="animate-spin" aria-hidden /> : null} Save draft
        </Button>
        <Button type="button" disabled={pending} onClick={() => save(true)}>
          {pending && mode === "submit" ? <Loader2 className="animate-spin" aria-hidden /> : null} Submit for approval
        </Button>
      </div>
    </form>
  );
}
