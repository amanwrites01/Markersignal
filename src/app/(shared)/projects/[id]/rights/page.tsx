import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { RightsForm } from "@/components/rights/rights-form";
import { RightsRecordPanel } from "@/components/rights/rights-record-panel";
import { RightsLegalNotice } from "@/components/rights/legal-notice";
import { requireViewer } from "@/lib/auth/session";
import { getProjectRights } from "@/lib/data/rights";
import { getTaxonomy } from "@/lib/data/taxonomy";

export const metadata: Metadata = { title: "Rights Passport" };

export default async function RightsPassportPage({ params, searchParams }: PageProps<"/projects/[id]/rights">) {
  const viewer = await requireViewer();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const [rights, taxonomy] = await Promise.all([getProjectRights(id, viewer.id), getTaxonomy()]);
  if (!rights) notFound();
  const { project, role, records } = rights;
  const locked = project.status === "cancelled";
  const deliverables = rights.deliverables.map((d) => ({ id: d.id, name: d.title }));
  const backHref = `/${role}/projects/${project.id}`;

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden /> Back to project
      </Link>
      <PageHeader
        eyebrow="Rights Passport"
        title={project.title}
        description={`Usage terms between ${rights.creatorName} (creator) and ${rights.brandName} (brand). Each record needs approval from both sides.`}
        actions={<StatusBadge status={project.status} />}
      />
      <div className="grid gap-6">
        <RightsLegalNotice />
        {records.map((r) => (
          <Panel key={r.id}>
            <RightsRecordPanel
              projectId={project.id}
              role={role}
              record={r}
              brandName={rights.brandName}
              creatorName={rights.creatorName}
              platforms={taxonomy.platforms}
              deliverables={deliverables}
              locked={locked}
            />
          </Panel>
        ))}
        {!locked && (records.length === 0 || isNew === "1") ? (
          <Panel>
            <h2 className="h-section mb-5">{records.length ? "Add a record for a specific deliverable" : "Record the usage terms"}</h2>
            <RightsForm
              projectId={project.id}
              recordId={null}
              platforms={taxonomy.platforms}
              deliverables={deliverables}
              initial={{
                title: `Usage rights — ${project.title}`,
                deliverableId: "",
                contentType: "",
                platformIds: [],
                organicUse: true,
                paidAdsUse: false,
                paidAdsNotes: "",
                territory: "Worldwide",
                licenseStart: "",
                licenseEnd: "",
                durationMonths: 12,
                exclusivity: "none",
                exclusivityDetails: "",
                rawFilesIncluded: false,
                rawFilesNotes: "",
                derivativeEditsAllowed: false,
                derivativeNotes: "",
                aiTrainingAllowed: false,
                attributionRequired: false,
                attributionDetails: "",
                additionalTerms: "",
              }}
            />
          </Panel>
        ) : !locked ? (
          <Link href={`/projects/${project.id}/rights?new=1`} className="text-sm font-medium underline-offset-4 hover:underline">
            + Add a separate record for one deliverable
          </Link>
        ) : null}
      </div>
    </>
  );
}
