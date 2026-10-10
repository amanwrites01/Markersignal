import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PROJECT_TABS, getProjectList } from "@/lib/data/projects";
import { deadlineLabel, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE = { overdue: "text-danger", soon: "text-warning", normal: "text-ink-muted" } as const;

export async function ProjectList({ userId, role, tab }: { userId: string; role: "creator" | "brand"; tab?: string }) {
  const { tab: active, projects, counts } = await getProjectList(userId, role, tab);
  const base = `/${role}/projects`;
  return (
    <>
      <PageHeader eyebrow={role === "brand" ? "Brand" : "Creator"} title="Projects" description="Accepted proposals become projects. Agree scope, deliver, review and approve here." />
      <nav aria-label="Project status" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {PROJECT_TABS.map((t) => (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            aria-current={t.key === active.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm whitespace-nowrap", t.key === active.key ? "border-forest font-medium" : "border-transparent text-ink-muted hover:text-forest")}
          >
            {t.label} <span className="ml-1 text-xs text-ink-muted">{counts[t.key] ?? 0}</span>
          </Link>
        ))}
      </nav>
      {projects.length ? (
        <ul className="grid gap-3">
          {projects.map((p) => {
            const open = (p.deliverables ?? []).filter((d) => d.status !== "approved");
            const nextDue = open.map((d) => d.due_date).filter(Boolean).sort()[0] ?? (p.status !== "completed" && p.status !== "cancelled" ? p.due_date : null);
            const dl = ["completed", "cancelled"].includes(p.status) ? null : deadlineLabel(nextDue);
            const approved = (p.deliverables ?? []).filter((d) => d.status === "approved").length;
            const total = (p.deliverables ?? []).length;
            return (
              <li key={p.id}>
                <Link href={`${base}/${p.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-5 hover:border-forest/30">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.title}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {role === "brand" ? p.creator_profiles?.display_name : p.brand_profiles?.brand_name} · {approved}/{total} deliverables approved
                      {p.agreed_amount_cents != null ? ` · ${formatMoney(p.agreed_amount_cents, p.currency)} recorded` : ""}
                    </p>
                  </div>
                  {dl ? <span className={cn("text-sm", TONE[dl.tone])}>{dl.label}</span> : null}
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title={`No ${active.label.toLowerCase()} projects`}
          description={role === "brand" ? "Accept a proposal to start a project." : "When a brand accepts your proposal, the project appears here."}
        />
      )}
    </>
  );
}
