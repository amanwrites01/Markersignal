"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, MessagesSquare, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { MatchScore } from "@/components/matching/match-breakdown";
import { ProposalAiSummary } from "@/components/ai/ai-buttons";
import { acceptProposal, markUnderReview, openProposalConversation, rejectProposal, revealIdentity } from "@/server/proposals";
import type { Comparison } from "@/lib/proposal-compare";
import { formatDate, formatDateTime, formatMoney, initials } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";

export type BrandProposal = {
  id: string;
  campaign_title: string;
  blind_review: boolean;
  status: string;
  approach: string | null;
  timeline_days: number | null;
  proposed_delivery_date: string | null;
  quote_cents: number | null;
  currency: string;
  revisions_included: number | null;
  usage_notes: string | null;
  submitted_at: string | null;
  identity_revealed: boolean;
  creator_id: string | null;
  creator_label: string;
  creator_slug: string | null;
  creator_avatar_path: string | null;
  creator_headline: string | null;
  creator_location: string | null;
  skills: string[];
  styles: string[];
  categories: string[];
  match_score: number | null;
  deliverables: { type: string; platform: string | null; quantity: number; description: string | null; price_cents: number | null }[];
  samples: { id: string; title: string; description: string | null; media_type: string; media_path: string | null; external_url: string | null }[];
  project_id: string | null;
};

const TONE = {
  ok: { icon: CheckCircle2, cls: "text-success" },
  warn: { icon: AlertTriangle, cls: "text-warning" },
  neutral: { icon: MinusCircle, cls: "text-ink-muted" },
};

export function BrandProposalCard({ p, comparisons }: { p: BrandProposal; comparisons: Comparison[] }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const router = useRouter();
  const masked = p.blind_review && !p.identity_revealed;
  const decided = ["accepted", "rejected", "withdrawn"].includes(p.status);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <article className="rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby={`p-${p.id}`}>
      <header className="flex flex-wrap items-start gap-4">
        {masked ? (
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-ink-muted" aria-hidden>
            <EyeOff className="size-5" />
          </span>
        ) : (
          <Avatar className="size-12">
            {p.creator_avatar_path ? <AvatarImage src={publicFileUrl("avatars", p.creator_avatar_path)!} alt="" /> : null}
            <AvatarFallback className="bg-forest text-lime">{initials(p.creator_label)}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`p-${p.id}`} className="font-semibold">
              {masked || !p.creator_slug ? (
                p.creator_label
              ) : (
                <Link href={`/creators/${p.creator_slug}`} className="underline-offset-4 hover:underline">
                  {p.creator_label}
                </Link>
              )}
            </h3>
            <StatusBadge status={p.status} />
            {p.match_score != null ? <MatchScore score={p.match_score} /> : null}
          </div>
          <p className="text-sm text-ink-muted">
            {masked
              ? [p.categories.join(", "), "identity hidden"].filter(Boolean).join(" · ")
              : [p.creator_headline, p.creator_location].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {p.campaign_title} · submitted {formatDateTime(p.submitted_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{formatMoney(p.quote_cents, p.currency)}</p>
          <p className="text-xs text-ink-muted">
            {p.timeline_days ? `${p.timeline_days} days · ` : ""}delivers {formatDate(p.proposed_delivery_date)}
          </p>
        </div>
      </header>

      {masked ? (
        <div className="mt-4 rounded-xl bg-secondary p-4 text-sm">
          <p className="font-medium">Blind Brief Room</p>
          <p className="mt-1 text-forest/80">
            Hidden for now: the creator&apos;s name, profile photo, headline, location and profile link. Shown: their approach, quote, deliverables,
            skills, creative style and attached portfolio samples. Samples or style may still make a creator recognisable — this isn&apos;t complete
            anonymity.
          </p>
        </div>
      ) : null}

      <ul className="mt-4 grid gap-1.5 sm:grid-cols-3" aria-label="Comparison with your brief">
        {comparisons.map((c) => {
          const T = TONE[c.tone];
          return (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              <T.icon className={`mt-0.5 size-4 shrink-0 ${T.cls}`} aria-hidden />
              <span>
                <span className="font-medium">{c.label}:</span> {c.detail}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">Approach</p>
          <p className="mt-1.5 text-[15px] leading-7 whitespace-pre-line">{p.approach}</p>
          <ProposalAiSummary proposalId={p.id} />
          {p.usage_notes ? (
            <>
              <p className="eyebrow mt-4">Usage-rights notes</p>
              <p className="mt-1.5 text-sm whitespace-pre-line">{p.usage_notes}</p>
            </>
          ) : null}
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <p className="eyebrow">Deliverables</p>
            <ul className="mt-1.5 grid gap-1">
              {p.deliverables.map((d, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {d.quantity} × {d.type}
                    {d.platform ? <span className="text-ink-muted"> · {d.platform}</span> : null}
                  </span>
                  {d.price_cents != null ? <span>{formatMoney(d.price_cents, p.currency)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Skills & style</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {p.styles.map((s) => (
                <li key={s} className="rounded-full bg-forest px-2 py-0.5 text-xs text-ivory">
                  {s}
                </li>
              ))}
              {p.skills.map((s) => (
                <li key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          {p.samples.length ? (
            <div>
              <p className="eyebrow">Samples</p>
              <ul className="mt-1.5 grid gap-1">
                {p.samples.map((s) => {
                  const href = s.media_path ? publicFileUrl("portfolio", s.media_path) : s.external_url;
                  return (
                    <li key={s.id}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                          {s.title} <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        s.title
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
        {p.project_id ? (
          <Button asChild>
            <Link href={`/brand/projects/${p.project_id}`}>Open project</Link>
          </Button>
        ) : null}
        {masked && !decided ? (
          <Button variant="outline" disabled={pending} onClick={() => run(() => revealIdentity(p.id))}>
            <Eye aria-hidden /> Reveal identity
          </Button>
        ) : null}
        {!masked && p.status !== "withdrawn" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await openProposalConversation(p.id);
                if (r.ok) router.push(`/messages/${r.data.conversationId}`);
                else toast.error(r.error);
              })
            }
          >
            <MessagesSquare aria-hidden /> Message
          </Button>
        ) : null}
        {p.status === "submitted" ? (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => markUnderReview(p.id))}>
            Mark under review
          </Button>
        ) : null}
        {!decided ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={pending}>
                  Decline
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this proposal?</AlertDialogTitle>
                  <AlertDialogDescription>The creator will be notified. A short, kind note helps them improve.</AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the creator" aria-label="Note to the creator" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run(() => rejectProposal(p.id, note))}>Decline</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={pending}>Accept proposal</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Accept {masked ? "this proposal" : `${p.creator_label}'s proposal`}?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="grid gap-2">
                      <p>
                        This creates a project in <strong>Awaiting agreement</strong>. You and the creator then confirm the scope and usage rights
                        before work starts.
                      </p>
                      {masked ? <p>The creator&apos;s identity will be revealed to you.</p> : null}
                      <p>No payment is taken or held — the {formatMoney(p.quote_cents, p.currency)} quote is recorded for planning.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the creator" aria-label="Note to the creator" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      start(async () => {
                        const r = await acceptProposal(p.id, note);
                        if (r.ok) {
                          toast.success(r.message);
                          router.push(`/brand/projects/${r.data.projectId}`);
                        } else toast.error(r.error);
                      })
                    }
                  >
                    Accept and create project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </footer>
    </article>
  );
}
