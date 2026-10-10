import type { Metadata } from "next";
import Link from "next/link";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Proposals" };

const TABS = [
  { key: "active", label: "In review", statuses: ["submitted", "under_review"] },
  { key: "drafts", label: "Drafts", statuses: ["draft"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  { key: "closed", label: "Closed", statuses: ["rejected", "withdrawn"] },
];

export default async function CreatorProposalsPage({ searchParams }: PageProps<"/creator/proposals">) {
  const viewer = await requireRole("creator");
  const tabKey = (await searchParams).tab;
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0]!;
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("proposals")
    .select("id, status, quote_cents, currency, submitted_at, updated_at, campaigns(id, title, deadline, brand_profiles(brand_name))")
    .eq("creator_id", viewer.id)
    .order("updated_at", { ascending: false });
  const counts = Object.fromEntries(TABS.map((t) => [t.key, (all ?? []).filter((p) => t.statuses.includes(p.status)).length]));
  const rows = (all ?? []).filter((p) => tab.statuses.includes(p.status));

  return (
    <>
      <PageHeader
        eyebrow="Creator"
        title="Proposals"
        description="Drafts, sent proposals and decisions."
        actions={
          <Button asChild variant="outline">
            <Link href="/explore/campaigns">Find campaigns</Link>
          </Button>
        }
      />
      <nav aria-label="Proposal status" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/creator/proposals?tab=${t.key}`}
            aria-current={t.key === tab.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm whitespace-nowrap", t.key === tab.key ? "border-forest font-medium" : "border-transparent text-ink-muted hover:text-forest")}
          >
            {t.label} <span className="ml-1 text-xs text-ink-muted">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/creator/proposals/${p.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.campaigns?.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {p.campaigns?.brand_profiles?.brand_name} · {p.submitted_at ? `sent ${formatDate(p.submitted_at)}` : `edited ${formatDate(p.updated_at)}`}
                  </p>
                </div>
                <span className="text-sm font-medium">{formatMoney(p.quote_cents, p.currency)}</span>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Send}
          title={tab.key === "active" ? "No proposals in review" : `No ${tab.label.toLowerCase()} proposals`}
          description="Open a campaign brief and choose “Send proposal” to start a draft."
          action={
            <Button asChild>
              <Link href="/explore/campaigns">Browse campaigns</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
