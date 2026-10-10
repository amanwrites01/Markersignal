import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <main id="main" className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside className="on-dark relative hidden overflow-hidden bg-forest p-12 text-ivory lg:flex lg:flex-col lg:justify-end">
        <div aria-hidden className="absolute -top-24 -right-24 size-[420px] rounded-full border border-lime/20" />
        <div aria-hidden className="absolute -top-8 -right-8 size-[260px] rounded-full border border-lime/30" />
        <p className="eyebrow !text-lime">Creativity, Connected.</p>
        <p className="mt-4 text-3xl leading-tight font-semibold tracking-tight">
          Clear briefs. Explainable matches. Usage rights both sides can read.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-ivory/75">
          <li>— Creative DNA matching that shows its reasoning</li>
          <li>— Rights Passport for every deliverable</li>
          <li>— Milestones, versions and approvals in one place</li>
        </ul>
      </aside>
    </div>
  );
}
