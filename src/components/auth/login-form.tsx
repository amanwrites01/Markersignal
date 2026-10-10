"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Clapperboard, ArrowRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { resendConfirmation, signIn } from "@/server/auth";

export interface LoginFormProps {
  role?: "creator" | "brand";
  next?: string;
  defaultEmail?: string;
  onSwitchRole?: (newRole: "creator" | "brand", email?: string) => void;
}

export function LoginForm({ role, next, defaultEmail = "", onSwitchRole }: LoginFormProps) {
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [mismatchRole, setMismatchRole] = useState<"brand" | "creator" | null>(null);
  const [resending, startResend] = useTransition();

  const { form, submit, pending, formError, setFormError } = useActionForm<LoginInput>({
    schema: loginSchema,
    defaultValues: { email: defaultEmail, password: "", next, role },
    action: async (values) => {
      setMismatchRole(null);
      const result = await signIn(values);
      if (result && !result.ok) {
        setUnconfirmed(result.fieldErrors?.email?.[0] === "unconfirmed");
        const detected = result.fieldErrors?.role?.[0];
        if (detected === "brand_account_detected") {
          setMismatchRole("brand");
        } else if (detected === "creator_account_detected") {
          setMismatchRole("creator");
        }
      }
      return result;
    },
  });

  const { register, formState: { errors }, getValues, setValue } = form;

  useEffect(() => {
    setValue("role", role);
  }, [role, setValue]);

  useEffect(() => {
    if (defaultEmail) {
      setValue("email", defaultEmail);
    }
  }, [defaultEmail, setValue]);

  const router = useRouter();

  const handleSwitch = (target: "creator" | "brand") => {
    setMismatchRole(null);
    setFormError(null);
    const currentEmail = getValues("email");
    if (onSwitchRole) {
      onSwitchRole(target, currentEmail);
    } else {
      router.push(`/auth/login/${target}?email=${encodeURIComponent(currentEmail)}`);
    }
  };

  const buttonLabel = role === "creator" ? "Log in as Creator" : role === "brand" ? "Log in as Brand" : "Log in";

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <input type="hidden" {...register("role")} />
      <input type="hidden" {...register("next")} />

      {mismatchRole ? (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
              <AlertCircle className="size-5" aria-hidden />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-forest">
                {mismatchRole === "brand" ? "Brand Account Detected" : "Creator Account Detected"}
              </p>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                {mismatchRole === "brand" ? (
                  <>
                    This account is registered as a <strong className="text-forest">Brand</strong>. You are currently on the Creator login form.
                  </>
                ) : (
                  <>
                    This account is registered as a <strong className="text-forest">Creator</strong>. You are currently on the Brand login form.
                  </>
                )}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSwitch(mismatchRole)}
                className="mt-1 gap-1.5 border-warning/40 bg-white font-medium text-forest hover:bg-warning-soft hover:border-warning"
              >
                {mismatchRole === "brand" ? (
                  <>
                    <Building2 className="size-4" /> Go to Brand Login <ArrowRight className="size-3.5" />
                  </>
                ) : (
                  <>
                    <Clapperboard className="size-4" /> Go to Creator Login <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <FormError message={formError} />
      )}

      {unconfirmed ? (
        <Button
          type="button"
          variant="outline"
          disabled={resending}
          onClick={() =>
            startResend(async () => {
              const r = await resendConfirmation(getValues("email"));
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            })
          }
        >
          Resend confirmation email
        </Button>
      ) : null}

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" placeholder="Enter your password" {...register("password")} />
      </Field>

      <div className="-mt-1 text-right">
        <Link href="/auth/forgot-password" className="text-sm text-ink-muted underline-offset-4 hover:text-forest hover:underline">
          Forgot password?
        </Link>
      </div>

      <SubmitButton pending={pending} size="lg" className="w-full" pendingLabel="Signing in…">
        {buttonLabel}
      </SubmitButton>

      {role ? (
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <span>{role === "creator" ? "Looking for Brand access?" : "Looking for Creator access?"}</span>
          <button
            type="button"
            onClick={() => handleSwitch(role === "creator" ? "brand" : "creator")}
            className="font-medium text-forest underline underline-offset-2 hover:text-forest/80 cursor-pointer"
          >
            {role === "creator" ? "Switch to Brand Login" : "Switch to Creator Login"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
