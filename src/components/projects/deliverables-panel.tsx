"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, ExternalLink, FileText, MessageSquareWarning, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { MediaUpload } from "@/components/inputs/media-upload";
import { useActionForm } from "@/hooks/use-action-form";
import { deliverableSchema, versionSchema, type DeliverableInput, type VersionInput } from "@/lib/validation/project";
import { deleteDeliverable, reviewDeliverable, saveDeliverable, submitVersion } from "@/server/projects";
import { deadlineLabel, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionButton } from "./reason-dialog";

type Version = {
  id: string;
  version_number: number;
  notes: string | null;
  file_name: string | null;
  size_bytes: number | null;
  external_url: string | null;
  download_url: string | null;
  created_at: string;
};
type Feedback = { id: string; version_id: string | null; decision: string; body: string | null; author_id: string; created_at: string };
export type PanelDeliverable = {
  id: string;
  title: string;
  description: string | null;
  milestone_id: string | null;
  deliverable_type_id: number | null;
  platform_id: number | null;
  due_date: string | null;
  status: string;
  current_version: number;
  revision_count: number;
  deliverable_types: { name: string } | null;
  platforms: { name: string } | null;
  versions: Version[];
  feedback: Feedback[];
};
type Opt = { id: number | string; name: string };

const TONE = { overdue: "text-danger", soon: "text-warning", normal: "text-ink-muted" } as const;
const ACTIVE = ["active", "in_review", "revision_requested"];

export function DeliverablesPanel({
  projectId,
  role,
  projectStatus,
  deliverables,
  milestones,
  deliverableTypes,
  platforms,
  names,
}: {
  projectId: string;
  role: "brand" | "creator";
  projectStatus: string;
  deliverables: PanelDeliverable[];
  milestones: { id: string; title: string }[];
  deliverableTypes: Opt[];
  platforms: Opt[];
  names: Record<string, string>;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const editable = !["completed", "cancelled"].includes(projectStatus);
  const opts = { milestones: milestones.map((m) => ({ id: m.id, name: m.title })), deliverableTypes, platforms };

  return (
    <div className="grid gap-4">
      {deliverables.length === 0 && editing !== "new" ? <EmptyState title="No deliverables yet" description="Add each piece of work so it can be submitted, reviewed and approved." /> : null}
      {deliverables.map((d) =>
        editing === d.id ? (
          <DeliverableForm key={d.id} projectId={projectId} deliverable={d} opts={opts} onDone={() => setEditing(null)} />
        ) : (
          <DeliverableCard key={d.id} d={d} projectId={projectId} role={role} projectStatus={projectStatus} names={names} onEdit={editable && d.status !== "approved" ? () => setEditing(d.id) : undefined} />
        ),
      )}
      {editable ? (
        editing === "new" ? (
          <DeliverableForm projectId={projectId} opts={opts} onDone={() => setEditing(null)} />
        ) : (
          <div>
            <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
              <Plus aria-hidden /> Add deliverable
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

function DeliverableCard({
  d,
  projectId,
  role,
  projectStatus,
  names,
  onEdit,
}: {
  d: PanelDeliverable;
  projectId: string;
  role: "brand" | "creator";
  projectStatus: string;
  names: Record<string, string>;
  onEdit?: () => void;
}) {
  const dl = d.status !== "approved" ? deadlineLabel(d.due_date) : null;
  const canSubmit = role === "creator" && ACTIVE.includes(projectStatus) && ["not_started", "revision_requested"].includes(d.status);
  const canReview = role === "brand" && d.status === "submitted";
  const feedbackFor = (versionId: string) => d.feedback.filter((f) => f.version_id === versionId);

  return (
    <article className="rounded-2xl border border-line bg-white" aria-labelledby={`del-${d.id}`}>
      <header className="flex flex-wrap items-start gap-3 border-b border-line p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`del-${d.id}`} className="font-semibold">
              {d.title}
            </h3>
            <StatusBadge status={d.status} />
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {[d.deliverable_types?.name, d.platforms?.name, d.current_version ? `v${d.current_version}` : "No versions yet", d.revision_count ? `${d.revision_count} revision request${d.revision_count === 1 ? "" : "s"}` : null]
              .filter(Boolean)
              .join(" · ")}
            {dl ? <span className={cn("ml-2", TONE[dl.tone])}>{dl.label}</span> : null}
          </p>
          {d.description ? <p className="mt-2 text-sm">{d.description}</p> : null}
        </div>
        {onEdit ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil aria-hidden /> Edit
            </Button>
            {d.current_version === 0 ? (
              <ActionButton variant="ghost" size="sm" className="text-danger hover:text-danger" action={() => deleteDeliverable(projectId, d.id)}>
                <Trash2 aria-hidden /> Remove
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid gap-4 p-4 sm:p-5">
        {d.versions.length ? (
          <ol className="grid gap-3" aria-label="Version history">
            {d.versions.map((v) => (
              <li key={v.id} className={cn("rounded-xl border p-3", v.version_number === d.current_version ? "border-forest/25 bg-lime-soft/40" : "border-line")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Version {v.version_number}
                    {v.version_number === d.current_version ? <span className="ml-2 text-xs font-normal text-ink-muted">latest</span> : null}
                  </p>
                  <p className="text-xs text-ink-muted">{formatDateTime(v.created_at)}</p>
                </div>
                {v.notes ? <p className="mt-1 text-sm whitespace-pre-line">{v.notes}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {v.download_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={v.download_url} rel="noopener">
                        <Download aria-hidden /> {v.file_name ?? "Download file"}
                        {v.size_bytes ? <span className="text-ink-muted">({Math.max(1, Math.round(v.size_bytes / 1024))} KB)</span> : null}
                      </a>
                    </Button>
                  ) : v.file_name ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      <FileText className="size-3.5" aria-hidden /> {v.file_name} (link unavailable — refresh the page)
                    </span>
                  ) : null}
                  {v.external_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={v.external_url} target="_blank" rel="noopener noreferrer nofollow">
                        <ExternalLink aria-hidden /> Open link
                      </a>
                    </Button>
                  ) : null}
                </div>
                {feedbackFor(v.id).map((f) => (
                  <div key={f.id} className={cn("mt-3 flex gap-2 rounded-lg p-2.5 text-sm", f.decision === "approved" ? "bg-lime-soft" : "bg-warning-soft")}>
                    {f.decision === "approved" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />}
                    <div>
                      <p className="text-xs font-medium">
                        {f.decision === "approved" ? "Approved" : "Revision requested"} by {names[f.author_id] ?? "Brand"} · {formatDateTime(f.created_at)}
                      </p>
                      {f.body ? <p className="mt-0.5 whitespace-pre-line">{f.body}</p> : null}
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-muted">{role === "creator" ? "Nothing submitted yet." : "Waiting for the creator's first version."}</p>
        )}

        {canSubmit ? <VersionForm projectId={projectId} deliverableId={d.id} nextVersion={d.current_version + 1} /> : null}
        {role === "creator" && !ACTIVE.includes(projectStatus) && d.status !== "approved" && projectStatus === "awaiting_agreement" ? (
          <p className="text-xs text-ink-muted">You can submit work once both parties confirm the scope.</p>
        ) : null}
        {canReview ? <ReviewForm projectId={projectId} deliverableId={d.id} version={d.current_version} /> : null}
      </div>
    </article>
  );
}

function VersionForm({ projectId, deliverableId, nextVersion }: { projectId: string; deliverableId: string; nextVersion: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<VersionInput>({
    schema: versionSchema as never,
    defaultValues: { notes: "", storagePath: null, fileName: null, mimeType: null, sizeBytes: null, externalUrl: "" },
    action: (v) => submitVersion(projectId, deliverableId, v),
    onSuccess: () => {
      setOpen(false);
      form.reset();
      router.refresh();
    },
  });
  const errors = form.formState.errors;
  const fileName = form.watch("fileName");
  if (!open)
    return (
      <div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Upload aria-hidden /> Submit version {nextVersion}
        </Button>
      </div>
    );
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-forest/20 bg-secondary/40 p-4" noValidate>
      <p className="text-sm font-medium">Submit version {nextVersion}</p>
      <FormError message={formError} />
      <div className="grid gap-2">
        <p className="text-sm">File (private — only you and the brand can download it)</p>
        <MediaUpload
          bucket="deliverables"
          folder={projectId}
          label="Upload file (max 50 MB)"
          onUploaded={(f) => {
            form.setValue("storagePath", f.path, { shouldValidate: true });
            form.setValue("fileName", f.name);
            form.setValue("mimeType", f.type);
            form.setValue("sizeBytes", f.size);
          }}
        />
        {fileName ? <p className="text-xs text-ink-muted">Attached: {fileName}</p> : null}
      </div>
      <Field label="Or link to the work" htmlFor="v-url" optional error={errors.externalUrl?.message}>
        <Input type="url" placeholder="https://drive.example.com/your-cut" {...form.register("externalUrl")} />
      </Field>
      <Field label="Notes for the brand" htmlFor="v-notes" optional error={errors.notes?.message}>
        <Textarea rows={3} placeholder="What changed in this version, and anything to look out for." {...form.register("notes")} />
      </Field>
      <p className="text-xs text-ink-muted">Earlier versions stay in the history — nothing is overwritten.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>Submit for review</SubmitButton>
      </div>
    </form>
  );
}

function ReviewForm({ projectId, deliverableId, version }: { projectId: string; deliverableId: string; version: number }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (decision: "approved" | "revision_requested") =>
    start(async () => {
      setError(null);
      const r = await reviewDeliverable(projectId, deliverableId, { decision, body });
      if (r.ok) {
        toast.success(r.message);
        setBody("");
        router.refresh();
      } else setError(r.fieldErrors?.body?.[0] ?? r.error);
    });
  return (
    <div className="grid gap-3 rounded-xl border border-forest/20 bg-secondary/40 p-4">
      <p className="text-sm font-medium">Review version {version}</p>
      <Field label="Feedback" htmlFor={`fb-${deliverableId}`} optional hint="Required when requesting a revision." error={error ?? undefined}>
        <Textarea rows={3} placeholder="e.g. Great pacing. Please brighten the first shot and shorten the outro to 3 seconds." value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={() => run("revision_requested")}>
          Request revision
        </Button>
        <Button disabled={pending} onClick={() => run("approved")}>
          <CheckCircle2 aria-hidden /> Approve version {version}
        </Button>
      </div>
    </div>
  );
}

function DeliverableForm({
  projectId,
  deliverable,
  opts,
  onDone,
}: {
  projectId: string;
  deliverable?: PanelDeliverable;
  opts: { milestones: Opt[]; deliverableTypes: Opt[]; platforms: Opt[] };
  onDone: () => void;
}) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<DeliverableInput>({
    schema: deliverableSchema as never,
    defaultValues: {
      title: deliverable?.title ?? "",
      description: deliverable?.description ?? "",
      milestoneId: deliverable?.milestone_id ?? "",
      deliverableTypeId: deliverable?.deliverable_type_id ?? null,
      platformId: deliverable?.platform_id ?? null,
      dueDate: deliverable?.due_date ?? "",
    },
    action: (v) => saveDeliverable(projectId, deliverable?.id ?? null, v),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const errors = form.formState.errors;
  const num = { setValueAs: (v: unknown) => (v === "" || v == null ? null : Number(v)) };
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-forest/20 bg-secondary/40 p-4" noValidate>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Deliverable" htmlFor="d-title" error={errors.title?.message}>
          <Input placeholder="e.g. Reel 1 — morning routine" {...form.register("title")} />
        </Field>
        <Field label="Due date" htmlFor="d-due" optional error={errors.dueDate?.message}>
          <Input type="date" {...form.register("dueDate")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="d-desc" optional error={errors.description?.message}>
        <Textarea rows={2} placeholder="Length, format, aspect ratio, captions…" {...form.register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Milestone" htmlFor="d-ms" optional>
          <NativeSelect {...form.register("milestoneId")}>
            <option value="">None</option>
            {opts.milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Type" htmlFor="d-type" optional>
          <NativeSelect {...form.register("deliverableTypeId", num)}>
            <option value="">—</option>
            {opts.deliverableTypes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Platform" htmlFor="d-platform" optional>
          <NativeSelect {...form.register("platformId", num)}>
            <option value="">—</option>
            {opts.platforms.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>{deliverable ? "Save deliverable" : "Add deliverable"}</SubmitButton>
      </div>
    </form>
  );
}
