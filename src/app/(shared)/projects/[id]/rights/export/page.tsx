import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RightsSummary } from "@/components/rights/rights-summary";
import { PrintButton } from "@/components/rights/print-button";
import { requireViewer } from "@/lib/auth/session";
import { getProjectRights } from "@/lib/data/rights";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Rights Passport — printable", robots: { index: false } };

export default async function RightsExportPage({ params, searchParams }: PageProps<"/projects/[id]/rights/export">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const { record } = await searchParams;
  const rights = await getProjectRights(id, viewer.id);
  if (!rights) notFound();
  const records = rights.records.filter((r) => typeof record !== "string" || r.id === record);
  if (!records.length) notFound();

  return (
    <>
      {/* Print only the document, not the workspace chrome. */}
      <style>{`@media print { aside, header, nav, [data-sonner-toaster] { display: none !important; } main { padding: 0 !important; } body { background: #fff !important; } }`}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/projects/${id}/rights`} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-forest">
          <ArrowLeft className="size-4" aria-hidden /> Back to Rights Passport
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 print:max-w-none print:border-0 print:p-0">
        <header className="border-b-2 border-forest pb-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">MAKERSIGNAL · Rights Passport</p>
          <h1 className="mt-2 text-2xl font-semibold">{rights.project.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Creator: {rights.creatorName} · Brand: {rights.brandName} · Exported {formatDateTime(new Date().toISOString())}
          </p>
        </header>
        <div className="mt-6 grid gap-10">
          {records.map((r) => (
            <section key={r.id} className="break-inside-avoid">
              <RightsSummary
                record={r}
                brandName={rights.brandName}
                creatorName={rights.creatorName}
                deliverableTitle={rights.deliverables.find((d) => d.id === r.deliverable_id)?.title ?? null}
              />
              <p className="mt-2 text-xs text-ink-muted">Record ID {r.id} · last updated {formatDateTime(r.updated_at)}</p>
            </section>
          ))}
        </div>
        <footer className="mt-10 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
          This document records the usage terms approved by each party through MAKERSIGNAL, with approval timestamps. It is not, by itself, a legally
          binding contract; enforceability depends on the parties&apos; overall agreement and applicable law. AI-training use is permitted only where
          stated above as explicitly permitted.
        </footer>
      </article>
    </>
  );
}
