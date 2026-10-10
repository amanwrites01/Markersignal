"use client";

import { AlertTriangle, CheckCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelProject, completeProject, disputeProject, resolveDispute } from "@/server/projects";
import { ReasonDialog } from "./reason-dialog";

export function ProjectActions({ projectId, role, status, allApproved, hasDeliverables }: { projectId: string; role: "brand" | "creator"; status: string; allApproved: boolean; hasDeliverables: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const open = !["completed", "cancelled"].includes(status);
  const canComplete = role === "brand" && ["active", "in_review", "revision_requested"].includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      {canComplete ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!allApproved || !hasDeliverables || pending} title={!allApproved ? "Approve every deliverable first" : undefined}>
              <CheckCheck aria-hidden /> Mark completed
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark this project completed?</AlertDialogTitle>
              <AlertDialogDescription>Every deliverable is approved. Completing closes the project and opens reviews for both sides. This can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  start(async () => {
                    const r = await completeProject(projectId);
                    if (r.ok) {
                      toast.success(r.message);
                      router.refresh();
                    } else toast.error(r.error);
                  })
                }
              >
                Complete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {status === "disputed" ? (
        <ReasonDialog
          trigger={<Button variant="outline">Resolve dispute</Button>}
          title="Resolve the dispute"
          description="Record how the issue was resolved. The project returns to active and work can continue."
          label="Resolution"
          placeholder="e.g. Agreed to extend the deadline by one week and add a third revision."
          confirmLabel="Resolve and resume"
          action={(v) => resolveDispute(projectId, v)}
        />
      ) : open ? (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <AlertTriangle aria-hidden /> Raise a dispute
            </Button>
          }
          title="Raise a dispute"
          description="Use this when you can't agree on scope, quality or timing. Work pauses and the other party is notified. MAKERSIGNAL doesn't arbitrate payments."
          label="What's the issue?"
          placeholder="Describe the problem and what you'd like to happen."
          confirmLabel="Raise dispute"
          action={(v) => disputeProject(projectId, v)}
        />
      ) : null}
      {open ? (
        <ReasonDialog
          trigger={
            <Button variant="ghost" className="text-danger hover:text-danger">
              <XCircle aria-hidden /> Cancel project
            </Button>
          }
          title="Cancel this project?"
          description="Cancelling ends the project for both parties. Versions and records stay available. This can't be undone."
          placeholder="Why is the project being cancelled?"
          confirmLabel="Cancel project"
          destructive
          action={(v) => cancelProject(projectId, v)}
        />
      ) : null}
    </div>
  );
}
