"use client";

import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/hooks/use-action-form";
import { commentSchema, type CommentInput } from "@/lib/validation/project";
import { addComment } from "@/server/projects";
import { relativeTime } from "@/lib/format";

type Comment = { id: string; author_id: string; body: string; created_at: string };

export function CommentsPanel({ projectId, comments, names, viewerId, canComment }: { projectId: string; comments: Comment[]; names: Record<string, string>; viewerId: string; canComment: boolean }) {
  const router = useRouter();
  const { form, submit, pending, formError } = useActionForm<CommentInput>({
    schema: commentSchema as never,
    defaultValues: { body: "" },
    action: (v) => addComment(projectId, v),
    successToast: false,
    onSuccess: () => {
      form.reset({ body: "" });
      router.refresh();
    },
  });
  return (
    <div className="grid gap-4">
      {comments.length ? (
        <ul className="grid gap-3">
          {comments.map((c) => (
            <li key={c.id} className={c.author_id === viewerId ? "ml-6 rounded-xl bg-lime-soft/60 p-3" : "mr-6 rounded-xl bg-secondary/60 p-3"}>
              <p className="text-xs text-ink-muted">
                <span className="font-medium text-forest">{c.author_id === viewerId ? "You" : names[c.author_id] ?? "Member"}</span> · {relativeTime(c.created_at)}
              </p>
              <p className="mt-1 text-sm whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">No comments yet. Use comments for decisions you want on the project record; use Messages for back-and-forth.</p>
      )}
      {canComment ? (
        <form onSubmit={submit} className="grid gap-2" noValidate>
          <FormError message={formError} />
          <Field label="Add a comment" htmlFor="comment-body" error={form.formState.errors.body?.message}>
            <Textarea rows={3} placeholder="e.g. Agreed: captions in English and Hindi for both reels." {...form.register("body")} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton pending={pending} size="sm">
              Post comment
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
