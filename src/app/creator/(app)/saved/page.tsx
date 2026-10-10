import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { SaveCampaignButton } from "@/components/discovery/save-campaign-button";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatBudget, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Saved campaigns" };

export default async function SavedCampaignsPage() {
  const viewer = await requireRole("creator");
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_campaigns")
    .select("created_at, campaigns(id, title, status, objective, deadline, budget_min_cents, budget_max_cents, currency, brand_profiles(brand_name))")
    .eq("creator_id", viewer.id)
    .order("created_at", { ascending: false });
  // Campaigns the creator can no longer see (e.g. made invite-only) come back null.
  const rows = (data ?? []).filter((r) => r.campaigns);

  return (
    <>
      <PageHeader eyebrow="Creator" title="Saved campaigns" description="Briefs you bookmarked to come back to." />
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map(({ campaigns: c, created_at }) => (
            <li key={c!.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">
                  {c!.brand_profiles?.brand_name} · saved {formatDate(created_at)}
                </p>
                <Link href={`/campaigns/${c!.id}`} className="mt-1 block font-semibold underline-offset-4 hover:underline">
                  {c!.title}
                </Link>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {formatBudget(c!.budget_min_cents, c!.budget_max_cents, c!.currency)} · Deadline {formatDate(c!.deadline)}
                </p>
              </div>
              {c!.status !== "published" ? <StatusBadge status={c!.status} /> : null}
              <SaveCampaignButton campaignId={c!.id} saved refreshOnChange />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Save campaigns from Explore or your recommendations to keep them here."
          action={
            <Button asChild>
              <Link href="/explore/campaigns">Explore campaigns</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
