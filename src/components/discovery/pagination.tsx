import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { withParams, type RawParams } from "./params";
import { cn } from "@/lib/utils";

export function Pagination({ basePath, params, page, total, perPage }: { basePath: string; params: RawParams; page: number; total: number; perPage: number }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const href = (n: number) => `${basePath}${withParams(params, { page: n === 1 ? undefined : n })}`;
  const window = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const link = "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-line bg-white px-3 text-sm hover:border-forest/40";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link} rel="prev">
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </Link>
      ) : null}
      {window.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - window[i - 1]! > 1 ? <span className="px-1 text-ink-muted" aria-hidden>…</span> : null}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={cn(link, n === page && "border-forest bg-forest text-ivory hover:border-forest")}>
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1)} className={link} rel="next">
          Next <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
