"use client";

import { ErrorView } from "@/components/site/error-view";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} digest={error.digest} />;
}
