import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus, Search, Sparkles } from "lucide-react";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { CompletenessCard, StatTile } from "@/components/dashboard/completeness-card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnBrandProfile } from "@/lib/data/brands";
import { brandCompleteness } from "@/lib/profile-completeness";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function BrandDashboard({ searchParams }: PageProps<"/brand/dashboard">) {
  const viewer = await requireRole("brand");
  const supabase = await createClient();
  const welcome = (await searchParams).welcome === "1";
  const [own, campaigns, proposals, shortlist, invitations] = await Promise.all([
    getOwnBrandProfile(viewer.id),
    supabase.from("campaigns").select("id, title, status, deadline, updated_at").eq("brand_id", viewer.id).in("status", ["draft", "published", "paused"]).order("updated_at", { ascending: false }).limit(6),
    supabase.rpc("brand_list_proposals", {}),
    supabase.from("saved_creators").select("creator_id", { count: "exact", head: true }).eq("brand_id", viewer.id),
    supabase.from("campaign_invitations").select("id, campaigns!inner(brand_id)", { count: "exact", head: true }).eq("campaigns.brand_id", viewer.id).eq("status", "pending"),
  ]);
  const b = own.profile!;
  const completeness = brandCompleteness({
    brandName: b.brand_name, description: b.description, logoPath: b.logo_path, website: b.website, industryId: b.industry_id,
    linkCount: own.links.length, hasContact: Boolean(own.contact?.contact_email || own.contact?.contact_name),
  });
  const incoming = (proposals.data ?? []).filter((p) => ["submitted", "under_review"].includes(p.status));

  return (
    <>
      <PageHeader
        eyebrow={welcome ? "Welcome to MAKERSIGNAL" : "Brand dashboard"}
        title={b.brand_name}
        description="Campaigns, proposals and creators at a glance."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/explore/creators">
                <Search aria-hidden /> Discover creators
              </Link>
            </Button>
            <Button asChild>
              <Link href="/brand/campaigns/new">
                <Plus aria-hidden /> New campaign
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active campaigns" value={(campaigns.data ?? []).filter((c) => c.status === "published").length} href="/brand/campaigns" />
        <StatTile label="Proposals to review" value={incoming.length} href="/brand/proposals" />
        <StatTile label="Pending invitations" value={invitations.count ?? 0} />
        <StatTile label="Shortlisted creators" value={shortlist.count ?? 0} href="/brand/shortlist" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <Section title="Your campaigns">
            {campaigns.data?.length ? (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {campaigns.data.map((c) => (
                  <li key={c.id}>
                    <Link href={`/brand/campaigns/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-secondary/40">
                      <div className="min-w-0">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-ink-muted">Deadline {formatDate(c.deadline)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create a campaign manually, or draft one with the Brief-to-Reality Simulator."
                action={
                  <div className="flex gap-2">
                    <Button asChild>
                      <Link href="/brand/campaigns/new">Create campaign</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/brand/campaigns/simulator">
                        <Sparkles aria-hidden /> Simulator
                      </Link>
                    </Button>
                  </div>
                }
              />
            )}
          </Section>
          <Section title="Incoming proposals">
            {incoming.length ? (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {incoming.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">{p.creator_label}</p>
                      <p className="text-xs text-ink-muted">{p.campaign_title}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No proposals waiting" description="Published campaigns collect proposals here. Invite matched creators to get things moving." />
            )}
          </Section>
        </div>
        <aside>
          <CompletenessCard title="Brand profile" percent={completeness.percent} items={completeness.items} />
        </aside>
      </div>
    </>
  );
}
