import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col">
      <div className="container-page py-6">
        <Logo />
      </div>
      <div className="container-page flex max-w-xl flex-1 flex-col items-start justify-center pb-24">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">We couldn&apos;t find that page.</h1>
        <p className="mt-3 text-ink-muted">
          The link may be wrong, or the page may be private — profiles can be hidden and projects are only visible to their members.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore/creators">Find creators</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
