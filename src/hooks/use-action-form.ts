"use client";

import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/errors";

type Options<TValues extends FieldValues, TResult> = {
  schema: z.ZodType<TValues, FieldValues>;
  defaultValues: DefaultValues<TValues>;
  action: (values: TValues) => Promise<ActionResult<TResult>>;
  onSuccess?: (data: TResult, message?: string) => void;
  successToast?: boolean;
};

/**
 * React Hook Form + Zod on the client, the same schema re-validated by the
 * server action. Server field errors are mapped back onto the form.
 */
export function useActionForm<TValues extends FieldValues, TResult = undefined>({
  schema,
  defaultValues,
  action,
  onSuccess,
  successToast = true,
}: Options<TValues, TResult>) {
  const form = useForm<TValues>({
    // raw: submit the user's input values; the server action parses/transforms them once.
    resolver: zodResolver(schema as never, undefined, { raw: true }) as unknown as Resolver<TValues>,
    defaultValues,
    mode: "onTouched",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    setFormMessage(null);
    startTransition(async () => {
      const result = await action(values);
      if (!result) return; // redirected
      if (result.ok) {
        setFormMessage(result.message ?? null);
        if (successToast && result.message) toast.success(result.message);
        onSuccess?.(result.data, result.message);
      } else {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(field as Path<TValues>, { message: messages[0] });
        }
      }
    });
  });

  return { form, submit, pending, formError, formMessage, setFormError };
}
