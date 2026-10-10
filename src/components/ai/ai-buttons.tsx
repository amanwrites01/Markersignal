"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiMatchExplanation, aiProposalSummary } from "@/server/ai";

/** AI summary of a proposal against the brief (brand only). */
export function ProposalAiSummary({ proposalId }: { proposalId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ summary: string; strengths: string[]; risks: string[]; questions: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (result) {
    return (
      <div className="mt-4 rounded-xl border border-forest/15 bg-lime-soft/60 p-4 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Sparkles className="size-4" aria-hidden /> AI-assisted summary
        </p>
        <p className="mt-1.5">{result.summary}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["Strengths", result.strengths],
            ["Risks or gaps", result.risks],
            ["Questions to ask", result.questions],
          ].map(([title, list]) => (
            <div key={title as string}>
              <p className="text-xs font-semibold">{title as string}</p>
              <ul className="mt-1 list-disc pl-4 text-xs">{(list as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-muted">Generated from the proposal text only. Check it against the proposal before deciding.</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await aiProposalSummary(proposalId);
            if (r.ok) setResult(r.data);
            else setError(r.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Summarise with AI
      </Button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/** Rewords a stored match explanation with AI (from the stored factors only). */
export function MatchAiButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await aiMatchExplanation(matchId);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} AI summary
    </Button>
  );
}
