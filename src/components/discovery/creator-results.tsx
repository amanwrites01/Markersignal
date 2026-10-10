import { SearchX } from "lucide-react";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { InviteButton, ShortlistButton } from "@/components/marketplace/brand-creator-actions";
import { EmptyState } from "@/components/empty-state";
import { getViewer } from "@/lib/auth/session";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { createClient } from "@/lib/supabase/server";
import type { CreatorCardData } from "@/components/marketplace/creator-card";

/** Creator grid; signed-in brands get Shortlist / Invite on each card. */
export async function CreatorResults({ rows, failed }: { rows: CreatorCardData[]; failed?: boolean }) {
  if (failed) return <EmptyState icon={SearchX} title="Search is unavailable right now" description="Please try again in a moment." />;
  if (!rows.length) return <EmptyState icon={SearchX} title="No creators match these filters" description="Try removing a filter or searching for a broader keyword." />;

  const viewer = await getViewer();
  const isBrand = viewer?.profile.role === "brand";
  let saved = new Set<string>();
  let campaigns: { id: string; title: string }[] = [];
  if (isBrand) {
    const supabase = await createClient();
    const [{ data }, invitable] = await Promise.all([
      supabase.from("saved_creators").select("creator_id").eq("brand_id", viewer!.id).in("creator_id", rows.map((r) => r.id)),
      getInvitableCampaigns(viewer!.id),
    ]);
    saved = new Set((data ?? []).map((d) => d.creator_id));
    campaigns = invitable;
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((c) => (
        <li key={c.id}>
          <CreatorCard
            creator={c}
            action={
              isBrand ? (
                <>
                  <ShortlistButton creatorId={c.id} saved={saved.has(c.id)} size="sm" />
                  <InviteButton creatorId={c.id} creatorName={c.display_name} campaigns={campaigns} size="sm" />
                </>
              ) : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
