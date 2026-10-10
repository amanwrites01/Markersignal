"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { verifyEmailCode } from "@/server/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string(),
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6,8}$/, "Enter the verification code")),
  kind: z.enum(["signup", "magiclink", "recovery"]),
});
type Values = z.infer<typeof schema>;

export function VerifyCodeForm({ email, kind, defaultCode = "" }: { email: string; kind: Values["kind"]; defaultCode?: string }) {
  const codeLength = defaultCode ? defaultCode.length : 6;
  const { form, submit, pending, formError } = useActionForm<Values>({
    schema,
    defaultValues: { email, kind, code: defaultCode },
    action: verifyEmailCode,
  });

  useEffect(() => {
    if (defaultCode) {
      form.setValue("code", defaultCode);
    }
  }, [defaultCode, form]);

  return (
    <form onSubmit={submit} className="grid gap-4 text-left" noValidate>
      <FormError message={formError} />
      <Field label={codeLength === 6 ? "6-digit code" : "Verification code"} htmlFor="code" error={form.formState.errors.code?.message}>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={codeLength}
          placeholder={defaultCode || (codeLength === 6 ? "123456" : "12345678")}
          className="h-12 text-center font-mono text-xl tracking-[0.25em] sm:tracking-[0.4em]"
          {...form.register("code")}
        />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Verifying…">
        {kind === "recovery" ? "Verify and choose a new password" : "Verify and continue"}
      </SubmitButton>
    </form>
  );
}
