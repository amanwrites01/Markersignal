"use client";

import { useEffect } from "react";
import { Controller, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { ImageUpload } from "@/components/inputs/image-upload";
import { useActionForm } from "@/hooks/use-action-form";
import { slugify } from "@/lib/validation/common";
import {
  LINK_KINDS,
  TEAM_SIZES,
  brandBasicsSchema,
  brandContactSchema,
  profileLinksSchema,
  type BrandBasicsInput,
  type BrandContactInput,
  type ProfileLinksInput,
} from "@/lib/validation/brand";
import { saveBrandBasics, saveBrandContact, saveProfileLinks } from "@/server/onboarding";
import type { Option } from "@/lib/data/taxonomy";

type StepProps<T> = { initial: T; onSaved?: () => void; submitLabel?: string; step?: number };

export function BrandBasicsForm({
  initial,
  onSaved,
  submitLabel = "Save and continue",
  step = 1,
  industries,
  userId,
}: StepProps<BrandBasicsInput> & { industries: Option[]; userId: string }) {
  const { form, submit, pending, formError } = useActionForm<BrandBasicsInput>({
    schema: brandBasicsSchema as never,
    defaultValues: initial,
    action: (v) => saveBrandBasics(v, step),
    onSuccess: onSaved,
  });
  const { register, control, watch, setValue, formState: { errors, dirtyFields } } = form;
  const name = watch("brandName");
  useEffect(() => {
    if (!initial.slug && !dirtyFields.slug && name) setValue("slug", slugify(name));
  }, [name, initial.slug, dirtyFields.slug, setValue]);

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <Controller
        control={control}
        name="logoPath"
        render={({ field }) => (
          <Field label="Logo" htmlFor="logo" optional hint="Square images work best. PNG, JPG, WebP or SVG up to 5 MB.">
            <ImageUpload
              bucket="brand-logos"
              userId={userId}
              value={field.value}
              onChange={field.onChange}
              label="Upload logo"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
            />
          </Field>
        )}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand name" htmlFor="brandName" error={errors.brandName?.message}>
          <Input {...register("brandName")} autoComplete="organization" placeholder="e.g. Kapoor Organics" />
        </Field>
        <Field label="Brand URL" htmlFor="slug" hint="Used in links to your campaigns." error={errors.slug?.message}>
          <Input {...register("slug")} autoCapitalize="none" spellCheck={false} placeholder="kapoor-organics" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Industry" htmlFor="industryId" error={errors.industryId?.message}>
          <NativeSelect {...register("industryId")}>
            <option value="">Select an industry</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Country" htmlFor="locationCountry" optional error={errors.locationCountry?.message}>
          <Input {...register("locationCountry")} autoComplete="country-name" placeholder="e.g. India" />
        </Field>
      </div>
      <Field label="About the brand" htmlFor="description" optional hint="What you make, who it's for, and the tone you want creators to capture." error={errors.description?.message}>
        <Textarea {...register("description")} rows={5} maxLength={3000} placeholder="What you make, who it’s for, and the tone you want creators to capture." />
      </Field>
      <Field label="Website" htmlFor="website" optional error={errors.website?.message}>
        <Input type="url" placeholder="https://" {...register("website")} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function ProfileLinksForm({ initial, onSaved, submitLabel = "Save and continue", step }: StepProps<ProfileLinksInput>) {
  const { form, submit, pending, formError } = useActionForm<ProfileLinksInput>({
    schema: profileLinksSchema as never,
    defaultValues: initial,
    action: (v) => saveProfileLinks(v, step),
    onSuccess: onSaved,
  });
  const { control, register, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "links" });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      {fields.length === 0 ? <p className="meta">No links yet. Add your website or social profiles.</p> : null}
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[130px_1fr_auto] items-start gap-2">
          <NativeSelect aria-label="Link type" {...register(`links.${i}.kind` as const)}>
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "x" ? "X" : k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </NativeSelect>
          <div>
            <Input aria-label="URL" type="url" placeholder="https://" {...register(`links.${i}.url` as const)} aria-invalid={errors.links?.[i]?.url ? true : undefined} />
            {errors.links?.[i]?.url ? <p role="alert" className="mt-1 text-xs text-danger">{errors.links[i]?.url?.message}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={() => remove(i)}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={fields.length >= 10} onClick={() => append({ kind: "instagram", url: "" })}>
          <Plus aria-hidden /> Add link
        </Button>
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function BrandContactForm({ initial, onSaved, submitLabel = "Save and continue", step = 3 }: StepProps<BrandContactInput>) {
  const { form, submit, pending, formError } = useActionForm<BrandContactInput>({
    schema: brandContactSchema as never,
    defaultValues: initial,
    action: (v) => saveBrandContact(v, step),
    onSuccess: onSaved,
  });
  const { register, formState: { errors } } = form;
  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-forest/80">These details are private to your account. Creators talk to you through project messages.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="contactName" optional error={errors.contactName?.message}>
          <Input {...register("contactName")} autoComplete="name" placeholder="e.g. Neha Kapoor" />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" optional error={errors.contactEmail?.message}>
          <Input type="email" {...register("contactEmail")} autoComplete="email" placeholder="team@yourbrand.com" />
        </Field>
        <Field label="Phone" htmlFor="contactPhone" optional error={errors.contactPhone?.message}>
          <Input type="tel" {...register("contactPhone")} autoComplete="tel" placeholder="+91 98765 43210" />
        </Field>
        <Field label="Team size" htmlFor="teamSize" optional>
          <NativeSelect {...register("teamSize")}>
            <option value="">Select</option>
            {TEAM_SIZES.map((t) => (
              <option key={t} value={t}>
                {t === "solo" ? "Just me" : `${t} people`}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
