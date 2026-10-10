import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { InviteButton } from "@/components/marketplace/brand-creator-actions";
import { RemoveFromShortlist, ShortlistNote } from "@/components/discovery/shortlist-item-actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getInvitableCampaigns } from "@/lib/data/brand-campaigns";
import { publicFileUrl } from "@/lib/storage";
import { formatDate, formatMoney, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Shortlist" };

export default async function ShortlistPage() {
  const viewer = await requireRole("brand");
  const supabase = await createClient();
  const [{ data }, campaigns] = await Promise.all([
    supabase
      .from("saved_creators")
      .select("creator_id, note, created_at, creator_profiles(id, slug, display_name, headline, avatar_path, availability, starting_rate_cents, currency)")
      .eq("brand_id", viewer.id)
      .order("created_at", { ascending: false }),
    getInvitableCampaigns(viewer.id),
  ]);
  const rows = (data ?? []).filter((r) => r.creator_profiles);

  return (
    <>
      <PageHeader
        eyebrow="Brand"
        title="Shortlist"
        description="Creators you've saved, with private notes only your team can see."
        actions={
          <Button asChild variant="outline">
            <Link href="/brand/creators">Find more creators</Link>
          </Button>
        }
      />
      {rows.length ? (
        <ul className="grid gap-4">
          {rows.map(({ creator_profiles: c, note, created_at }) => (
            <li key={c!.id} className="grid gap-4 rounded-2xl border border-line bg-white p-5 md:grid-cols-[1fr_1fr_auto] md:items-start">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar className="size-12">
                  {c!.avatar_path ? <AvatarImage src={publicFileUrl("avatars", c!.avatar_path)!} alt="" /> : null}
                  <AvatarFallback className="bg-forest text-lime">{initials(c!.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link href={`/creators/${c!.slug}`} className="font-semibold underline-offset-4 hover:underline">
                    {c!.display_name}
                  </Link>
                  {c!.headline ? <p className="line-clamp-2 text-sm text-ink-muted">{c!.headline}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <StatusBadge status={c!.availability} />
                    {c!.starting_rate_cents != null ? <span>from {formatMoney(c!.starting_rate_cents, c!.currency)}</span> : null}
                    <span>Saved {formatDate(created_at)}</span>
                  </div>
                </div>
              </div>
              <ShortlistNote creatorId={c!.id} note={note} />
              <div className="flex gap-2 md:justify-end">
                <InviteButton creatorId={c!.id} creatorName={c!.display_name} campaigns={campaigns} size="sm" />
                <RemoveFromShortlist creatorId={c!.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Your shortlist is empty"
          description="Shortlist creators from search, recommendations or their profiles."
          action={
            <Button asChild>
              <Link href="/brand/creators">Find creators</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
