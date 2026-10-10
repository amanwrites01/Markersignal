"use client";

import { ErrorView } from "@/components/site/error-view";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex-1">
      <ErrorView reset={reset} digest={error.digest} />
    </main>
  );
}
