"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorView({ reset, digest }: { reset: () => void; digest?: string }) {
  return (
    <div className="container-page flex max-w-xl flex-col items-start py-24">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page hit a problem.</h1>
      <p className="mt-3 text-ink-muted">Trying again usually fixes it. If it keeps happening, let us know and include the reference below.</p>
      {digest ? <p className="mt-2 font-mono text-xs text-ink-muted">Reference: {digest}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
