"use client";

import { useState, useTransition } from "react";
import { Building2, Clapperboard, Loader2 } from "lucide-react";
import { FormError } from "@/components/form/field";
import { chooseRole } from "@/server/onboarding";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    value: "creator" as const,
    icon: Clapperboard,
    title: "I'm a creator",
    body: "Show your portfolio and Creative DNA, find paid briefs, send proposals and keep usage rights on record.",
  },
  {
    value: "brand" as const,
    icon: Building2,
    title: "I'm a brand",
    body: "Plan campaigns, discover creators with explainable matches, review proposals and manage delivery.",
  },
];

export function RoleChooser() {
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-8 grid gap-4">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() => {
              setChoice(r.value);
              setError(null);
              start(async () => {
                const res = await chooseRole(r.value);
                if (res && !res.ok) setError(res.error);
              });
            }}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border border-line bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-[0_12px_30px_-18px_rgba(20,36,28,0.35)]",
              choice === r.value && "border-forest ring-2 ring-forest/15",
            )}
          >
            <span className="mb-5 grid size-11 place-items-center rounded-xl bg-forest text-lime">
              {pending && choice === r.value ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <r.icon className="size-5" aria-hidden />}
            </span>
            <span className="text-lg font-semibold">{r.title}</span>
            <span className="mt-1.5 text-sm text-ink-muted">{r.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
