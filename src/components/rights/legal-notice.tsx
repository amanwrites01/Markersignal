import Link from "next/link";
import { Scale } from "lucide-react";

export function RightsLegalNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className="flex gap-3 rounded-2xl border border-forest/15 bg-white p-4 text-sm">
      <Scale className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">A record of agreed terms — not automatically a contract.</p>
        {!compact ? (
          <p className="mt-1 text-ink-muted">
            The Rights Passport records what both parties approved, and when. It is not, on its own, a legally binding contract: whether these terms are
            enforceable depends on your overall agreement and the law that applies to you. For significant work, use a written agreement reviewed by a
            qualified adviser. See the{" "}
            <Link href="/terms#usage-rights" className="underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
