"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { changePasswordSchema, deletionRequestSchema, type ChangePasswordInput, type DeletionRequestInput } from "@/lib/validation/account";
import { cancelAccountDeletion, changePassword, requestAccountDeletion, signOutEverywhere } from "@/server/account";
import { formatDate } from "@/lib/format";

export function ChangePasswordForm() {
  const { form, submit, pending, formError } = useActionForm<ChangePasswordInput>({
    schema: changePasswordSchema,
    defaultValues: { currentPassword: "", password: "", confirm: "" },
    action: changePassword,
    onSuccess: () => form.reset(),
  });
  const errors = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" placeholder="Enter your current password" {...form.register("currentPassword")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" hint="At least 8 characters, with a letter and a number." error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" placeholder="Create a new password" {...form.register("password")} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" placeholder="Re-enter the new password" {...form.register("confirm")} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </div>
    </form>
  );
}

export function SignOutEverywhereButton() {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          <LogOut aria-hidden /> Sign out of all devices
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
          <AlertDialogDescription>This ends every session for your account, including this one. You&apos;ll need to log in again.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => start(() => signOutEverywhere())}>Sign out everywhere</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeletionSection({ pending: pendingRequest }: { pending: { id: string; created_at: string } | null }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [open, setOpen] = useState(false);
  const { form, submit, pending, formError } = useActionForm<DeletionRequestInput>({
    schema: deletionRequestSchema as never,
    defaultValues: { reason: "", confirm: "" as "DELETE" },
    action: requestAccountDeletion,
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  if (pendingRequest) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning">
        <p>
          <span className="font-medium">Deletion requested {formatDate(pendingRequest.created_at)}.</span> Our team will process it and email you. You can cancel until then.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await cancelAccountDeletion(pendingRequest.id);
              if (r.ok) {
                toast.success(r.message);
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Cancel request
        </Button>
      </div>
    );
  }

  return open ? (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-danger/25 p-4" noValidate>
      <FormError message={formError} />
      <Field label="Why are you leaving?" htmlFor="deletion-reason" optional>
        <Textarea rows={3} placeholder="Optional — helps us improve" {...form.register("reason")} />
      </Field>
      <Field label='Type "DELETE" to confirm' htmlFor="deletion-confirm" error={form.formState.errors.confirm?.message}>
        <Input autoComplete="off" placeholder="DELETE" {...form.register("confirm")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Keep my account
        </Button>
        <SubmitButton pending={pending} variant="destructive">
          Request deletion
        </SubmitButton>
      </div>
    </form>
  ) : (
    <Button variant="destructive" onClick={() => setOpen(true)}>
      <ShieldAlert aria-hidden /> Request account deletion
    </Button>
  );
}
