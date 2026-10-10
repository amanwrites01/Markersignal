"use client";

import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { ChipSelect } from "@/components/inputs/chip-select";
import { ImageUpload } from "@/components/inputs/image-upload";
import { useActionForm } from "@/hooks/use-action-form";
import { CURRENCIES, slugify } from "@/lib/validation/common";
import {
  creatorBasicsSchema,
  creatorDnaSchema,
  creatorRatesSchema,
  type CreatorBasicsInput,
  type CreatorDnaInput,
  type CreatorRatesInput,
} from "@/lib/validation/creator";
import { saveCreatorBasics, saveCreatorDna, saveCreatorRates } from "@/server/onboarding";
import type { Taxonomy } from "@/lib/data/taxonomy";

type StepProps<T> = { initial: T; onSaved?: () => void; submitLabel?: string; step?: number };

export function CreatorBasicsForm({ initial, onSaved, submitLabel = "Save and continue", step = 1, userId }: StepProps<CreatorBasicsInput> & { userId: string }) {
  const { form, submit, pending, formError } = useActionForm<CreatorBasicsInput>({
    schema: creatorBasicsSchema as never,
    defaultValues: initial,
    action: (v) => saveCreatorBasics(v, step),
    onSuccess: onSaved,
  });
  const { register, control, formState: { errors, dirtyFields }, watch, setValue } = form;
  const name = watch("displayName");

  // Suggest a slug from the display name until the user edits it.
  useEffect(() => {
    if (!initial.slug && !dirtyFields.slug && name) setValue("slug", slugify(name));
  }, [name, initial.slug, dirtyFields.slug, setValue]);

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <Controller
        control={control}
        name="avatarPath"
        render={({ field }) => (
          <Field label="Profile photo" htmlFor="avatar" optional hint="JPG, PNG or WebP up to 5 MB.">
            <ImageUpload bucket="avatars" userId={userId} value={field.value} onChange={field.onChange} label="Upload photo" shape="circle" />
          </Field>
        )}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input {...register("displayName")} autoComplete="nickname" placeholder="e.g. Aman" />
        </Field>
        <Field label="Profile URL" htmlFor="slug" hint={`makersignal.com/creators/${watch("slug") || "your-name"}`} error={errors.slug?.message}>
          <Input {...register("slug")} autoCapitalize="none" spellCheck={false} placeholder="aman" />
        </Field>
      </div>
      <Field label="Headline" htmlFor="headline" optional hint="One line on what you make — e.g. “Short-form product films for skincare brands”." error={errors.headline?.message}>
        <Input {...register("headline")} maxLength={140} placeholder="e.g. Story-driven reels for D2C brands" />
      </Field>
      <Field label="Bio" htmlFor="bio" optional hint="Who you work with, how you work, what you're proud of." error={errors.bio?.message}>
        <Textarea {...register("bio")} rows={5} maxLength={3000} placeholder="The brands you work with, how you approach a brief, and work you’re proud of." />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="City" htmlFor="locationCity" optional error={errors.locationCity?.message}>
          <Input {...register("locationCity")} autoComplete="address-level2" placeholder="e.g. Mumbai" />
        </Field>
        <Field label="Country" htmlFor="locationCountry" optional error={errors.locationCountry?.message}>
          <Input {...register("locationCountry")} autoComplete="country-name" placeholder="e.g. India" />
        </Field>
        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <Field label="Languages" htmlFor="languages" optional hint="Comma separated">
              <Input
                placeholder="English, Hindi"
                defaultValue={(field.value ?? []).join(", ")}
                onBlur={(e) => field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10))}
              />
            </Field>
          )}
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function CreatorDnaForm({ initial, onSaved, submitLabel = "Save and continue", step = 2, taxonomy }: StepProps<CreatorDnaInput> & { taxonomy: Taxonomy }) {
  const { form, submit, pending, formError } = useActionForm<CreatorDnaInput>({
    schema: creatorDnaSchema as never,
    defaultValues: initial,
    action: (v) => saveCreatorDna(v, step),
    onSuccess: onSaved,
  });
  const { control, formState: { errors }, watch } = form;
  const categoryIds = (watch("categoryIds") ?? []).map(Number);
  // Show skills for chosen categories first, then the rest.
  const skills = [...taxonomy.skills].sort((a, b) => Number(categoryIds.includes(b.categoryId ?? -1)) - Number(categoryIds.includes(a.categoryId ?? -1)));

  const chips = (name: keyof CreatorDnaInput, label: string, options: { id: number; name: string; description?: string | null }[], hint: string, max?: number) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{label}</legend>
          <p className="-mt-1 text-xs text-ink-muted">{hint}</p>
          <ChipSelect label={label} options={options} value={(field.value as number[]) ?? []} onChange={field.onChange} max={max} invalid={Boolean(errors[name])} />
          {errors[name] ? <p role="alert" className="text-xs font-medium text-danger">{String(errors[name]?.message)}</p> : null}
        </fieldset>
      )}
    />
  );

  return (
    <form onSubmit={submit} className="grid gap-7" noValidate>
      <FormError message={formError} />
      {chips("categoryIds", "What kind of creator are you?", taxonomy.categories, "Choose all that apply.")}
      {chips("styleIds", "Creative DNA", taxonomy.styles, "Up to 5 styles that describe your work. Brands match on these.", 5)}
      {chips("skillIds", "Skills", skills, "Skills you can show work for.")}
      {chips("platformIds", "Platforms", taxonomy.platforms, "Where your content usually lives (optional).")}
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function CreatorRatesForm({ initial, onSaved, submitLabel = "Save and continue", step = 3 }: StepProps<CreatorRatesInput>) {
  const { form, submit, pending, formError } = useActionForm<CreatorRatesInput>({
    schema: creatorRatesSchema as never,
    defaultValues: initial,
    action: (v) => saveCreatorRates(v, step),
    onSuccess: onSaved,
  });
  const { register, control, formState: { errors }, watch } = form;
  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <FormError message={formError} />
      <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
        <Field label="Starting rate" htmlFor="startingRate" optional hint="The lowest price you'd typically quote for a project. Shown as “from”." error={errors.startingRate?.message}>
          <Input inputMode="decimal" {...register("startingRate")} placeholder="e.g. 450" />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <NativeSelect {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Availability" htmlFor="availability" error={errors.availability?.message}>
          <NativeSelect {...register("availability")}>
            <option value="available">Available for new work</option>
            <option value="limited">Limited availability</option>
            <option value="unavailable">Not taking work right now</option>
          </NativeSelect>
        </Field>
        <Field label="Available from" htmlFor="availableFrom" optional error={errors.availableFrom?.message}>
          <Input type="date" {...register("availableFrom")} />
        </Field>
      </div>
      <Controller
        control={control}
        name="collaborationTypes"
        render={({ field }) => (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">How you work</legend>
            <ChipSelect
              label="How you work"
              options={[
                { id: "remote", name: "Remote" },
                { id: "on_site", name: "On-site" },
                { id: "hybrid", name: "Hybrid" },
              ]}
              value={field.value ?? []}
              onChange={field.onChange}
              invalid={Boolean(errors.collaborationTypes)}
            />
            {errors.collaborationTypes ? <p role="alert" className="text-xs font-medium text-danger">{errors.collaborationTypes.message}</p> : null}
          </fieldset>
        )}
      />
      <Field
        label="Profile visibility"
        htmlFor="visibility"
        hint={
          watch("visibility") === "hidden"
            ? "Hidden profiles don't appear in search; brands you already work with can still see you."
            : watch("visibility") === "members"
              ? "Only signed-in MAKERSIGNAL members can view your profile."
              : "Anyone can find and view your profile."
        }
      >
        <NativeSelect {...register("visibility")}>
          <option value="public">Public</option>
          <option value="members">Members only</option>
          <option value="hidden">Hidden</option>
        </NativeSelect>
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
