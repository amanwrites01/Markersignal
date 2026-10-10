import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { CompletenessItem } from "@/lib/profile-completeness";

export function CompletenessCard({ percent, items, title = "Profile completeness" }: { percent: number; items: CompletenessItem[]; title?: string }) {
  const todo = items.filter((i) => !i.done);
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-medium">{title}</p>
        <p className="text-2xl font-semibold">{percent}%</p>
      </div>
      <Progress value={percent} className="mt-3 h-2 [&>div]:bg-forest" aria-label={`${title}: ${percent}%`} />
      {todo.length ? (
        <ul className="mt-4 grid gap-2 text-sm">
          {todo.slice(0, 4).map((i) => (
            <li key={i.key}>
              <Link href={i.href} className="flex items-center gap-2 hover:underline">
                <Circle className="size-3.5 text-gray-brand" aria-hidden /> {i.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <Check className="size-4" aria-hidden /> Everything&apos;s filled in.
        </p>
      )}
    </div>
  );
}

export function StatTile({ label, value, href, hint }: { label: string; value: number | string; href?: string; hint?: string }) {
  const body = (
    <>
      <p className="meta">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-line bg-white p-5">{body}</div>
  );
}
