"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProposalDraft, openProposalConversation, submitProposal, withdrawProposal } from "@/server/proposals";

export function CreatorProposalActions({
  id,
  status,
  canSubmit,
  campaignOpen,
  canMessage,
}: {
  id: string;
  status: string;
  canSubmit: boolean;
  campaignOpen: boolean;
  canMessage: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        if (after) after();
        else router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" ? (
        <>
          <Button asChild variant="outline">
            <Link href={`/creator/proposals/${id}?edit=1`}>
              <Pencil aria-hidden /> Edit draft
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-danger hover:text-danger" disabled={pending}>
                Delete draft
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                <AlertDialogDescription>The brand never saw it. This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => run(() => deleteProposalDraft(id), () => router.push("/creator/proposals"))}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={pending || !canSubmit || !campaignOpen}>
                <Send aria-hidden /> Submit proposal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send this proposal?</AlertDialogTitle>
                <AlertDialogDescription>
                  The brand will be notified and can review it. You can&apos;t edit it after sending, but you can withdraw it while it&apos;s under review.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not yet</AlertDialogCancel>
                <AlertDialogAction onClick={() => run(() => submitProposal(id))}>Send proposal</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
      {canMessage ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await openProposalConversation(id);
              if (r.ok) router.push(`/messages/${r.data.conversationId}`);
              else toast.error(r.error);
            })
          }
        >
          <MessagesSquare aria-hidden /> Message brand
        </Button>
      ) : null}
      {["submitted", "under_review"].includes(status) ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              Withdraw
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw this proposal?</AlertDialogTitle>
              <AlertDialogDescription>The brand will be told it was withdrawn. You won&apos;t be able to send another for this campaign.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => withdrawProposal(id))}>Withdraw</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
