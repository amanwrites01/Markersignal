"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & { pending?: boolean; pendingLabel?: string };

/** Submit button that shows progress for both <form action> and RHF submissions. */
export function SubmitButton({ children, pending, pendingLabel, disabled, ...props }: Props) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" disabled={busy || disabled} aria-busy={busy} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {busy && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
