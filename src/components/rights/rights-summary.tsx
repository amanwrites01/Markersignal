import { Check, Clock, Minus } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { RightsRecordView } from "@/lib/data/rights";
import { formatDate, formatDateTime } from "@/lib/format";

const EXCL: Record<string, string> = { none: "None", category: "Category exclusivity", full: "Full exclusivity" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function YesNo({ on, yes, no, note }: { on: boolean | null; yes: string; no: string; note?: string | null }) {
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1.5 font-medium">
        {on ? <Check className="size-4 text-success" aria-hidden /> : <Minus className="size-4 text-gray-brand" aria-hidden />}
        {on ? yes : no}
      </span>
      {note ? <span className="text-ink-muted">{note}</span> : null}
    </span>
  );
}

export function ApprovalChips({ record, brandName, creatorName }: { record: RightsRecordView; brandName: string; creatorName: string }) {
  return (
    <ul className="flex flex-wrap gap-2 text-xs" aria-label="Approvals">
      {[
        { who: `Brand · ${brandName}`, at: record.brand_approved_at },
        { who: `Creator · ${creatorName}`, at: record.creator_approved_at },
      ].map((x) => (
        <li key={x.who} className={x.at ? "inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-2.5 py-1 text-forest" : "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-ink-muted"}>
          {x.at ? <Check className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
          {x.who}: {x.at ? `approved ${formatDateTime(x.at)}` : "not approved"}
        </li>
      ))}
    </ul>
  );
}

export function RightsSummary({ record, brandName, creatorName, deliverableTitle }: { record: RightsRecordView; brandName: string; creatorName: string; deliverableTitle?: string | null }) {
  const duration = record.license_end
    ? `${formatDate(record.license_start)} – ${formatDate(record.license_end)}`
    : record.duration_months
      ? `${record.duration_months} months from ${formatDate(record.license_start)}`
      : record.license_start
        ? `From ${formatDate(record.license_start)} (no end date recorded)`
        : "Not specified";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{record.title}</h3>
        <StatusBadge status={record.effective_status ?? "draft"} />
        <span className="text-xs text-ink-muted">Revision {record.revision}</span>
      </div>
      <div className="mt-3">
        <ApprovalChips record={record} brandName={brandName} creatorName={creatorName} />
      </div>
      {record.status === "disputed" && record.dispute_reason ? (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">Disputed: {record.dispute_reason}</p>
      ) : null}
      <dl className="mt-4">
        <Row label="Parties">
          Original creator: <span className="font-medium">{creatorName}</span> · Client/brand: <span className="font-medium">{brandName}</span>
        </Row>
        <Row label="Content">{[record.content_type, deliverableTitle ? `Deliverable: ${deliverableTitle}` : "All project deliverables"].filter(Boolean).join(" · ")}</Row>
        <Row label="Platforms">{record.platformNames.length ? record.platformNames.join(", ") : "Not specified"}</Row>
        <Row label="Organic social use">
          <YesNo on={record.organic_use} yes="Permitted" no="Not permitted" />
        </Row>
        <Row label="Paid advertising">
          <YesNo on={record.paid_ads_use} yes="Permitted" no="Not permitted" note={record.paid_ads_notes} />
        </Row>
        <Row label="Territory">{record.territory}</Row>
        <Row label="License period">{duration}</Row>
        <Row label="Exclusivity">
          <span className="inline-flex flex-col">
            <span className="font-medium">{EXCL[record.exclusivity ?? "none"]}</span>
            {record.exclusivity_details ? <span className="text-ink-muted">{record.exclusivity_details}</span> : null}
          </span>
        </Row>
        <Row label="Raw files">
          <YesNo on={record.raw_files_included} yes="Delivered to the brand" no="Not included" note={record.raw_files_notes} />
        </Row>
        <Row label="Edits & derivative works">
          <YesNo on={record.derivative_edits_allowed} yes="Brand may edit / create derivatives" no="No edits without the creator's consent" note={record.derivative_notes} />
        </Row>
        <Row label="AI training">
          <YesNo on={record.ai_training_allowed} yes="Explicitly permitted" no="Not permitted" />
        </Row>
        <Row label="Attribution">
          <YesNo on={record.attribution_required} yes="Required" no="Not required" note={record.attribution_details} />
        </Row>
        <Row label="Additional terms">{record.additional_terms ? <span className="whitespace-pre-line">{record.additional_terms}</span> : "None"}</Row>
      </dl>
    </div>
  );
}
