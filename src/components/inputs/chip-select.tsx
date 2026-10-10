"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: number | string; name: string; description?: string | null };

/** Accessible multi-select as a group of toggle buttons (aria-pressed). */
export function ChipSelect({
  options,
  value,
  onChange,
  max,
  label,
  invalid,
}: {
  options: Option[];
  value: (number | string)[];
  onChange: (next: (number | string)[]) => void;
  max?: number;
  label: string;
  invalid?: boolean;
}) {
  const selected = new Set(value.map(String));
  const atMax = max !== undefined && selected.size >= max;
  return (
    <div role="group" aria-label={label} data-invalid={invalid || undefined} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.has(String(o.id));
        const disabled = !on && atMax;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            title={o.description ?? undefined}
            onClick={() => onChange(on ? value.filter((v) => String(v) !== String(o.id)) : [...value, o.id])}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              on ? "border-forest bg-forest text-ivory" : "border-line bg-white text-forest hover:border-forest/40",
              disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {on ? <Check className="size-3.5 text-lime" aria-hidden /> : null}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
