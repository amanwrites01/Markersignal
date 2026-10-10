"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUp } from "@/server/auth";

export function SignUpForm() {
  const { form, submit, pending, formError } = useActionForm<SignUpInput>({
    schema: signUpSchema,
    defaultValues: { fullName: "", email: "", password: "", acceptTerms: false as unknown as true },
    action: signUp,
  });
  const { register, formState: { errors }, setValue, watch } = form;

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input autoComplete="name" placeholder="e.g. Aman" {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message}>
        <PasswordInput autoComplete="new-password" placeholder="Create a password" {...register("password")} />
      </Field>
      <div className="grid gap-1">
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox
            checked={watch("acceptTerms") === true}
            onCheckedChange={(v) => setValue("acceptTerms", (v === true) as true, { shouldValidate: true })}
            aria-invalid={errors.acceptTerms ? true : undefined}
            className="mt-0.5"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4" target="_blank">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending} size="lg" className="mt-2 w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
