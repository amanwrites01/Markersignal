"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, FormError, FormSuccess } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { requestPasswordReset, updatePassword } from "@/server/auth";

export function ForgotPasswordForm() {
  const { form, submit, pending, formError, formMessage } = useActionForm<{ email: string }>({
    schema: forgotPasswordSchema,
    defaultValues: { email: "" },
    action: requestPasswordReset,
    successToast: false,
  });
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <FormSuccess message={formMessage} />
      <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full">
        Send reset link
      </SubmitButton>
      <Link href="/auth/login" className="text-center text-sm text-ink-muted hover:text-forest">
        Back to log in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<{ password: string; confirm: string }>({
    schema: resetPasswordSchema,
    defaultValues: { password: "", confirm: "" },
    action: updatePassword,
    onSuccess: () => router.push("/onboarding"),
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <Field label="New password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message}>
        <PasswordInput autoComplete="new-password" placeholder="Create a new password" {...form.register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" placeholder="Re-enter the new password" {...form.register("confirm")} />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
