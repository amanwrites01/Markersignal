import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function WizardFrame({
  steps,
  current,
  completedThrough,
  baseHref,
  title,
  description,
  children,
}: {
  steps: string[];
  current: number;
  completedThrough: number;
  baseHref: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <div className="container-page flex items-center justify-between py-6">
        <Logo />
        <p className="meta hidden sm:block">Progress is saved after every step.</p>
      </div>
      <main id="main" className="container-page grid max-w-5xl gap-10 pb-20 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Onboarding steps">
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {steps.map((label, i) => {
              const n = i + 1;
              const reachable = n <= completedThrough + 1;
              const done = n <= completedThrough;
              const active = n === current;
              const body = (
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap",
                    active ? "bg-white font-medium shadow-sm ring-1 ring-line" : "text-ink-muted",
                    reachable && !active && "hover:bg-white/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      done ? "bg-forest text-lime" : active ? "bg-lime text-forest" : "bg-secondary text-ink-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : n}
                  </span>
                  {label}
                </span>
              );
              return (
                <li key={label} aria-current={active ? "step" : undefined}>
                  {reachable ? <Link href={`${baseHref}?step=${n}`}>{body}</Link> : body}
                </li>
              );
            })}
          </ol>
        </nav>
        <section className="rounded-3xl border border-line bg-white p-6 sm:p-10">
          <p className="eyebrow">
            Step {current} of {steps.length}
          </p>
          <h1 className="h-page mt-2">{title}</h1>
          {description ? <p className="mt-2 mb-8 text-ink-muted">{description}</p> : <div className="mb-8" />}
          {children}
        </section>
      </main>
    </div>
  );
}
