"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageIcon, Loader2, Pencil, Plus, Sparkles, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { MediaUpload } from "@/components/inputs/media-upload";
import { EmptyState } from "@/components/empty-state";
import { useActionForm } from "@/hooks/use-action-form";
import { portfolioItemSchema, type PortfolioItemInput } from "@/lib/validation/creator";
import { deletePortfolioItem, savePortfolioItem } from "@/server/creator";
import { aiPortfolioDescription } from "@/server/ai";
import { publicFileUrl } from "@/lib/storage";
import type { Taxonomy } from "@/lib/data/taxonomy";

export type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  category_id: number | null;
  deliverable_type_id: number | null;
  platform_id: number | null;
  industry_id: number | null;
  client_name: string | null;
  media_type: string;
  media_path: string | null;
  external_url: string | null;
};

const empty: PortfolioItemInput = {
  title: "", description: "", categoryId: null, deliverableTypeId: null, platformId: null, industryId: null,
  clientName: "", mediaType: "image", mediaPath: null, externalUrl: "",
};

function toInput(i: PortfolioItem): PortfolioItemInput {
  return {
    title: i.title, description: i.description ?? "", categoryId: i.category_id, deliverableTypeId: i.deliverable_type_id,
    platformId: i.platform_id, industryId: i.industry_id, clientName: i.client_name ?? "",
    mediaType: i.media_type as "image", mediaPath: i.media_path, externalUrl: i.external_url ?? "",
  };
}

export function PortfolioManager({ items, taxonomy, userId }: { items: PortfolioItem[]; taxonomy: Taxonomy; userId: string }) {
  const [editing, setEditing] = useState<PortfolioItem | "new" | null>(null);
  const names = (list: { id: number; name: string }[], id: number | null) => list.find((x) => x.id === id)?.name;

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add portfolio piece
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Your portfolio is empty"
          description="Add at least three pieces. Matching uses each piece's deliverable type, category and industry as evidence of experience."
          action={<Button onClick={() => setEditing("new")}>Add your first piece</Button>}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-[4/3] bg-secondary">
                {item.media_type === "image" && item.media_path ? (
                  <Image src={publicFileUrl("portfolio", item.media_path)!} alt={item.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                ) : item.media_type === "video" && item.media_path ? (
                  <video src={publicFileUrl("portfolio", item.media_path)!} className="size-full object-cover" muted playsInline preload="metadata" aria-label={item.title} />
                ) : (
                  <div className="grid size-full place-items-center text-ink-muted">
                    <ExternalLink className="size-6" aria-hidden />
                  </div>
                )}
                {item.media_type === "video" ? (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-forest/80 px-2 py-0.5 text-[11px] text-ivory">
                    <Video className="size-3" aria-hidden /> Video
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {[names(taxonomy.deliverableTypes, item.deliverable_type_id), names(taxonomy.industries, item.industry_id), item.client_name].filter(Boolean).join(" · ") ||
                    "Add a deliverable type to strengthen matching"}
                </p>
                <div className="mt-3 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(item)}>
                    <Pencil aria-hidden /> Edit
                  </Button>
                  <DeleteItem id={item.id} title={item.title} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add portfolio piece" : "Edit portfolio piece"}</DialogTitle>
            <DialogDescription>Portfolio media is public on your profile. Only upload work you have the right to show.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <PortfolioForm
              key={editing === "new" ? "new" : editing.id}
              id={editing === "new" ? null : editing.id}
              initial={editing === "new" ? empty : toInput(editing)}
              taxonomy={taxonomy}
              userId={userId}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteItem({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
          <Trash2 aria-hidden /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>This removes the piece and its uploaded file from your public profile.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deletePortfolioItem(id);
                if (r.ok) {
                  toast.success(r.message);
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PortfolioForm({ id, initial, taxonomy, userId, onDone }: { id: string | null; initial: PortfolioItemInput; taxonomy: Taxonomy; userId: string; onDone: () => void }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<PortfolioItemInput, { id: string }>({
    schema: portfolioItemSchema as never,
    defaultValues: initial,
    action: (v) => savePortfolioItem(id, v),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  const { register, setValue, watch, formState: { errors } } = form;
  const [drafting, startDraft] = useTransition();
  const mediaType = watch("mediaType");
  const mediaPath = watch("mediaPath");
  const select = (name: "categoryId" | "deliverableTypeId" | "platformId" | "industryId", label: string, options: { id: number; name: string }[]) => (
    <Field label={label} htmlFor={name} optional>
      <NativeSelect {...register(name, { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormError message={formError} />
      <Field label="Title" htmlFor="title" error={errors.title?.message}>
        <Input {...register("title")} placeholder="e.g. Juice launch reels" />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Media</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Media type">
          {(["image", "video", "link"] as const).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-forest has-[:checked]:bg-forest has-[:checked]:text-ivory">
              <input type="radio" value={t} className="sr-only" {...register("mediaType")} />
              {t === "link" ? "External link" : t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
        {mediaType !== "link" ? (
          <>
            <MediaUpload
              bucket="portfolio"
              folder={userId}
              accept={mediaType === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"}
              label={mediaPath ? "Replace file" : mediaType === "video" ? "Upload video (max 25 MB)" : "Upload image"}
              onUploaded={(f) => setValue("mediaPath", f.path, { shouldValidate: true })}
            />
            {mediaPath ? <p className="text-xs text-ink-muted">File attached.</p> : null}
          </>
        ) : null}
        <Field label={mediaType === "link" ? "Link to the work" : "Link to the live post"} htmlFor="externalUrl" optional={mediaType !== "link"} error={errors.externalUrl?.message}>
          <Input type="url" placeholder="https://" {...register("externalUrl")} />
        </Field>
      </fieldset>
      <Field label="Description" htmlFor="description" optional hint="The brief, your role, and the result (only claim results you can back up)." error={errors.description?.message}>
        <Textarea rows={4} {...register("description")} placeholder="The brief, what you did, and the outcome." />
      </Field>
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={drafting}
          onClick={() =>
            startDraft(async () => {
              const v = form.getValues();
              const r = await aiPortfolioDescription({
                title: v.title,
                deliverableType: taxonomy.deliverableTypes.find((d) => d.id === Number(v.deliverableTypeId))?.name,
                industry: taxonomy.industries.find((d) => d.id === Number(v.industryId))?.name,
                client: v.clientName ?? undefined,
                notes: v.description ?? undefined,
              });
              if (r.ok) {
                setValue("description", r.data, { shouldDirty: true });
                toast.success("AI draft added — edit it so it's accurate");
              } else toast.error(r.error);
            })
          }
        >
          {drafting ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Draft description with AI
        </Button>
        <span className="text-xs text-ink-muted">Uses only what you&apos;ve entered. Review before saving.</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {select("deliverableTypeId", "Deliverable type", taxonomy.deliverableTypes)}
        {select("categoryId", "Category", taxonomy.categories)}
        {select("industryId", "Industry", taxonomy.industries)}
        {select("platformId", "Platform", taxonomy.platforms)}
      </div>
      <Field label="Client" htmlFor="clientName" optional hint="Only name clients you're allowed to name." error={errors.clientName?.message}>
        <Input {...register("clientName")} placeholder="e.g. Kapoor Organics" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>{id ? "Save changes" : "Add to portfolio"}</SubmitButton>
      </div>
    </form>
  );
}
