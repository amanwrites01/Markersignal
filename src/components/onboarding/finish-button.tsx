"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finishOnboarding } from "@/server/onboarding";

export function FinishOnboardingButton({ children = "Finish and go to dashboard" }: { children?: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await finishOnboarding();
          if (r && !r.ok) toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}
