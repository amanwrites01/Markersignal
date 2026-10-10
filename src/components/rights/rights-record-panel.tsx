"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileJson, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RightsForm } from "./rights-form";
import { RightsSummary } from "./rights-summary";
import { ActionButton, ReasonDialog } from "@/components/projects/reason-dialog";
import { approveRights, disputeRights } from "@/server/rights";
import type { RightsRecordView } from "@/lib/data/rights";
import type { RightsInput } from "@/lib/validation/rights";

type Opt = { id: number | string; name: string };

export function toRightsInput(r: RightsRecordView): RightsInput {
  return {
    title: r.title ?? "",
    deliverableId: r.deliverable_id ?? "",
    contentType: r.content_type ?? "",
    platformIds: r.platformIds,
    organicUse: Boolean(r.organic_use),
    paidAdsUse: Boolean(r.paid_ads_use),
    paidAdsNotes: r.paid_ads_notes ?? "",
    territory: r.territory ?? "Worldwide",
    licenseStart: r.license_start ?? "",
    licenseEnd: r.license_end ?? "",
    durationMonths: r.duration_months,
    exclusivity: (r.exclusivity as "none") ?? "none",
    exclusivityDetails: r.exclusivity_details ?? "",
    rawFilesIncluded: Boolean(r.raw_files_included),
    rawFilesNotes: r.raw_files_notes ?? "",
    derivativeEditsAllowed: Boolean(r.derivative_edits_allowed),
    derivativeNotes: r.derivative_notes ?? "",
    aiTrainingAllowed: Boolean(r.ai_training_allowed),
    attributionRequired: Boolean(r.attribution_required),
    attributionDetails: r.attribution_details ?? "",
    additionalTerms: r.additional_terms ?? "",
  };
}

export function RightsRecordPanel({
  projectId,
  role,
  record,
  brandName,
  creatorName,
  platforms,
  deliverables,
  locked,
}: {
  projectId: string;
  role: "brand" | "creator";
  record: RightsRecordView;
  brandName: string;
  creatorName: string;
  platforms: Opt[];
  deliverables: Opt[];
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const status = record.effective_status ?? "draft";
  const awaitingMe = (role === "creator" && status === "awaiting_creator") || (role === "brand" && status === "awaiting_brand");
  const deliverableTitle = deliverables.find((d) => d.id === record.deliverable_id)?.name ?? null;

  if (editing) {
    return (
      <RightsForm
        projectId={projectId}
        recordId={record.id!}
        initial={toRightsInput(record)}
        platforms={platforms}
        deliverables={deliverables}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <RightsSummary record={record} brandName={brandName} creatorName={creatorName} deliverableTitle={deliverableTitle} />
      {awaitingMe ? (
        <div className="rounded-xl bg-lime-soft p-4 text-sm">
          <p className="font-medium">These terms are waiting for your approval.</p>
          <p className="mt-1 text-forest/80">Approving records that you agree to revision {record.revision} exactly as shown. If something is wrong, edit and resubmit, or raise a dispute.</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {awaitingMe ? (
          <ActionButton action={() => approveRights(projectId, record.id!, record.revision!)}>
            <CheckCircle2 aria-hidden /> Approve revision {record.revision}
          </ActionButton>
        ) : null}
        {!locked && status !== "expired" ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil aria-hidden /> {status === "agreed" ? "Propose changes" : status === "disputed" ? "Edit and resubmit" : "Edit terms"}
          </Button>
        ) : null}
        {!locked && status !== "draft" && status !== "disputed" ? (
          <ReasonDialog
            trigger={<Button variant="ghost">Dispute</Button>}
            title="Dispute these terms"
            description="Explain what's wrong. The record is marked disputed until someone edits and resubmits it."
            placeholder="e.g. Paid ads were not part of our agreement."
            confirmLabel="Record dispute"
            action={(v) => disputeRights(projectId, record.id!, v)}
          />
        ) : null}
        <Button asChild variant="ghost">
          <Link href={`/projects/${projectId}/rights/export?record=${record.id}`} target="_blank">
            <Download aria-hidden /> Printable copy
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <a href={`/projects/${projectId}/rights/export/json?record=${record.id}`} download>
            <FileJson aria-hidden /> JSON
          </a>
        </Button>
      </div>
      {status === "agreed" && !locked ? <p className="text-xs text-ink-muted">Proposing changes to agreed terms resets both approvals until the new version is approved.</p> : null}
    </div>
  );
}
