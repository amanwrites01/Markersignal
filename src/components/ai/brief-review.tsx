"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aiBriefReview } from "@/server/ai";

export function BriefReviewButton({ campaignId, aiReady }: { campaignId: string; aiReady: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof aiBriefReview>> | null>(null);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!aiReady || pending}
        title={aiReady ? undefined : "AI isn't configured on this site"}
        onClick={() =>
          start(async () => {
            setResult(await aiBriefReview(campaignId));
            setOpen(true);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Check brief with AI
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Brief completeness check</DialogTitle>
            <DialogDescription>AI-assisted suggestions. Edit the campaign to apply any you agree with.</DialogDescription>
          </DialogHeader>
          {result && !result.ok ? <p className="text-sm text-danger">{result.error}</p> : null}
          {result?.ok ? (
            <div className="grid gap-4 text-sm">
              <ul className="grid gap-2">
                {result.data.suggestions.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.field}:</span> {s.suggestion}
                  </li>
                ))}
              </ul>
              {result.data.ambiguities.length ? (
                <div>
                  <p className="font-medium">Possibly ambiguous</p>
                  <ul className="mt-1 list-disc pl-5">{result.data.ambiguities.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
