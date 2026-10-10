"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import type { ActionResult } from "@/lib/errors";

/** Dialog that collects a written reason, then calls a server action. */
export function ReasonDialog({
  trigger,
  title,
  description,
  label = "Reason",
  placeholder,
  confirmLabel,
  action,
  destructive,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  label?: string;
  placeholder?: string;
  confirmLabel: string;
  action: (input: { reason: string }) => Promise<ActionResult>;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Field label={label} htmlFor="reason-text" error={error ?? undefined}>
          <Textarea rows={4} maxLength={2000} placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await action({ reason });
                if (r.ok) {
                  toast.success(r.message);
                  setOpen(false);
                  setReason("");
                  router.refresh();
                } else setError(r.fieldErrors?.reason?.[0] ?? r.error);
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Button that runs a server action and refreshes. */
export function ActionButton({
  action,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & { action: () => Promise<ActionResult<unknown>> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() =>
        start(async () => {
          const r = await action();
          if (r.ok) {
            if (r.message) toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {children}
    </Button>
  );
}
