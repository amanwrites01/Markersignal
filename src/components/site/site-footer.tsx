import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Marketplace",
    links: [
      { href: "/explore/creators", label: "Find creators" },
      { href: "/explore/campaigns", label: "Find opportunities" },
      { href: "/auth/sign-up", label: "Join as a creator" },
      { href: "/auth/sign-up", label: "Join as a brand" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms#usage-rights", label: "Usage rights notice" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-forest text-ivory">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo dark />
          <p className="mt-4 text-sm text-ivory/70">Creativity, Connected. A marketplace for brands and content creators built on clear briefs and clear rights.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ivory/80 hover:text-ivory">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} MAKERSIGNAL. All rights reserved.</p>
          <p>Match scores and AI suggestions are estimates, not guarantees.</p>
        </div>
      </div>
    </footer>
  );
}
