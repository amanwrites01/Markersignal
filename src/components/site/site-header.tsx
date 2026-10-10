import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getViewer, homeFor, type Role } from "@/lib/auth/session";

const NAV = [
  { href: "/explore/creators", label: "Find creators" },
  { href: "/explore/campaigns", label: "Find opportunities" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const viewer = await getViewer();
  const dashboard = viewer ? (viewer.profile.onboarding_completed_at ? homeFor(viewer.profile.role as Role) : "/onboarding") : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/75">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm text-forest/80 transition-colors hover:bg-forest/5 hover:text-forest">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {dashboard ? (
            <Button asChild>
              <Link href={dashboard}>Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">Join MAKERSIGNAL</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm bg-ivory">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo />
              </SheetHeader>
              <nav aria-label="Mobile" className="grid gap-1 px-4">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-base hover:bg-forest/5">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 grid gap-2 px-4">
                {dashboard ? (
                  <Button asChild size="lg">
                    <Link href={dashboard}>Go to dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link href="/auth/sign-up">Join MAKERSIGNAL</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/auth/login">Log in</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
