import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // Signal wave inside a rounded square — "makers" + "signal".
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="#14241C" />
      <path d="M7 19.5c2.2 0 2.2-7 4.4-7s2.2 7 4.6 7 2.3-9 4.6-9 2.2 9 4.4 9" fill="none" stroke="#D3F36B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", dark = false, className }: { href?: string; dark?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-md", className)} aria-label="MAKERSIGNAL home">
      <LogoMark className={dark ? "[&_rect]:fill-[#20382B]" : undefined} />
      <span className={cn("text-[15px] font-semibold tracking-[0.08em]", dark ? "text-ivory" : "text-forest")}>MAKERSIGNAL</span>
    </Link>
  );
}
