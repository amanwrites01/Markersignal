import Link from "next/link";
import { Sparkles, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { InviteButton, ShortlistButton, type InviteCampaign } from "@/components/marketplace/brand-creator-actions";
import { MatchBreakdown, MatchScore, type StoredFactors } from "./match-breakdown";
import { MatchAiButton } from "@/components/ai/ai-buttons";
import { publicFileUrl } from "@/lib/storage";
import { formatMoney, initials } from "@/lib/format";
import { getCreatorCards } from "@/lib/data/creators";
import { createClient } from "@/lib/supabase/server";

export async function MatchList({
  campaignId,
  squadRoleId = null,
  brandId,
  inviteCampaigns,
  limit = 12,
  invitedIds = [],
}: {
  campaignId: string;
  squadRoleId?: string | null;
  brandId: string;
  inviteCampaigns: InviteCampaign[];
  limit?: number;
  invitedIds?: string[];
}) {
  const supabase = await createClient();
  let q = supabase
    .from("match_results")
    .select("id, creator_id, score, factors, explanation, ai_explanation, computed_at")
    .eq("campaign_id", campaignId)
    .order("score", { ascending: false })
    .limit(limit);
  q = squadRoleId ? q.eq("squad_role_id", squadRoleId) : q.is("squad_role_id", null);
  const { data: matches } = await q;
  const cards = await getCreatorCards((matches ?? []).map((m) => m.creator_id));
  const { data: saved } = await supabase.from("saved_creators").select("creator_id").eq("brand_id", brandId);
  const savedIds = new Set((saved ?? []).map((s) => s.creator_id));
  const invited = new Set(invitedIds);
  const byId = new Map(cards.map((c) => [c.id, c]));

  if (!matches?.length) {
    return <EmptyState icon={Users} title="No matches yet" description="Run matching to rank creators against this brief. Results show their reasons and can be refreshed after you edit the brief." />;
  }
  return (
    <ul className="grid gap-4">
      {matches.map((m) => {
        const c = byId.get(m.creator_id);
        if (!c) return null;
        return (
          <li key={m.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar className="size-12">
                {c.avatar_path ? <AvatarImage src={publicFileUrl("avatars", c.avatar_path)!} alt="" /> : null}
                <AvatarFallback className="bg-forest text-lime">{initials(c.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/creators/${c.slug}`} className="font-semibold underline-offset-4 hover:underline">
                    {c.display_name}
                  </Link>
                  <MatchScore score={m.score} tier={(m.factors as StoredFactors)?.tier} />
                </div>
                <p className="text-sm text-ink-muted">
                  {[c.headline, c.starting_rate_cents != null ? `from ${formatMoney(c.starting_rate_cents, c.currency)}` : null].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-sm">{m.explanation}</p>
                {m.ai_explanation ? (
                  <p className="mt-2 flex gap-1.5 text-sm text-forest/80">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="sr-only">AI-assisted summary: </span>
                      {m.ai_explanation}
                    </span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-start gap-3">
                  <MatchBreakdown factors={m.factors as StoredFactors} className="flex-1" />
                  {!m.ai_explanation ? <MatchAiButton matchId={m.id} /> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <ShortlistButton creatorId={c.id} saved={savedIds.has(c.id)} size="sm" />
                {invited.has(c.id) ? (
                  <span className="inline-flex h-8 items-center rounded-full bg-secondary px-3 text-xs font-medium">Invited</span>
                ) : (
                  <InviteButton creatorId={c.id} creatorName={c.display_name} campaigns={inviteCampaigns} defaultCampaignId={campaignId} squadRoleId={squadRoleId} size="sm" />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
