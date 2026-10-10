"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form/field";
import { submitReview } from "@/server/projects";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Review = { id: string; direction: string; rating: number; body: string | null; created_at: string; reviewer_id: string };

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-4", i < value ? "fill-forest text-forest" : "text-line")} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewPanel({ projectId, role, reviews, names }: { projectId: string; role: "brand" | "creator"; reviews: Review[]; names: Record<string, string> }) {
  const myDirection = role === "brand" ? "brand_to_creator" : "creator_to_brand";
  const mine = reviews.find((r) => r.direction === myDirection);
  const theirs = reviews.find((r) => r.direction !== myDirection);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-4">
      {mine ? (
        <div className="rounded-xl border border-line p-4">
          <p className="text-xs text-ink-muted">Your review · {formatDate(mine.created_at)}</p>
          <Stars value={mine.rating} label={`${mine.rating} out of 5`} />
          {mine.body ? <p className="mt-1 text-sm">{mine.body}</p> : null}
        </div>
      ) : (
        <div className="grid gap-3 rounded-xl border border-forest/20 bg-secondary/40 p-4">
          <fieldset>
            <legend className="text-sm font-medium">How was working with {role === "brand" ? "this creator" : "this brand"}?</legend>
            <div role="radiogroup" aria-label="Rating" className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setRating(n)}
                  className="rounded p-0.5"
                >
                  <Star className={cn("size-7", n <= rating ? "fill-forest text-forest" : "text-gray-brand")} aria-hidden />
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Written feedback" htmlFor="review-body" optional error={error ?? undefined}>
            <Textarea rows={3} placeholder="What went well, and what could be better?" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-muted">Reviews are public on the {role === "brand" ? "creator's" : "brand's"} profile, marked as a verified MAKERSIGNAL project. One review per side.</p>
          <div className="flex justify-end">
            <Button
              disabled={pending || rating === 0}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await submitReview(projectId, { rating, body });
                  if (r.ok) {
                    toast.success(r.message);
                    router.refresh();
                  } else setError(r.error);
                })
              }
            >
              Publish review
            </Button>
          </div>
        </div>
      )}
      {theirs ? (
        <div className="rounded-xl border border-line p-4">
          <p className="text-xs text-ink-muted">
            {names[theirs.reviewer_id] ?? "The other party"} reviewed you · {formatDate(theirs.created_at)}
          </p>
          <Stars value={theirs.rating} label={`${theirs.rating} out of 5`} />
          {theirs.body ? <p className="mt-1 text-sm">{theirs.body}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">The other party hasn&apos;t left a review yet.</p>
      )}
    </div>
  );
}
