import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatBudget, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Campaigns" };

const TABS = [
  { key: "active", label: "Active", statuses: ["draft", "published", "paused"] },
  { key: "closed", label: "Closed", statuses: ["closed"] },
  { key: "archived", label: "Archived", statuses: ["archived"] },
];

export default async function BrandCampaignsPage({ searchParams }: PageProps<"/brand/campaigns">) {
  const viewer = await requireRole("brand");
  const tabKey = (await searchParams).tab;
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0]!;
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, status, budget_min_cents, budget_max_cents, currency, deadline, updated_at, proposals(count)")
    .eq("brand_id", viewer.id)
    .in("status", tab.statuses)
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        eyebrow="Brand"
        title="Campaigns"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/brand/campaigns/simulator">
                <Sparkles aria-hidden /> Brief simulator
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
      <nav aria-label="Campaign status" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/brand/campaigns?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm", t.key === tab.key ? "border-forest font-medium" : "border-transparent text-ink-muted hover:text-forest")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {campaigns?.length ? (
        <ul className="grid gap-3">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link href={`/brand/campaigns/${c.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatBudget(c.budget_min_cents, c.budget_max_cents, c.currency)} · Deadline {formatDate(c.deadline)}
                  </p>
                </div>
                <span className="text-sm text-ink-muted">{(c.proposals as unknown as { count: number }[])[0]?.count ?? 0} proposals</span>
                <StatusBadge status={c.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Megaphone}
          title={tab.key === "active" ? "No active campaigns" : `No ${tab.label.toLowerCase()} campaigns`}
          description={tab.key === "active" ? "Create a campaign to start receiving proposals." : undefined}
          action={
            tab.key === "active" ? (
              <Button asChild>
                <Link href="/brand/campaigns/new">Create a campaign</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </>
  );
}
