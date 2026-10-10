"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { respondInvitation } from "@/server/invitations";

export function InvitationActions({ invitationId, campaignId }: { invitationId: string; campaignId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const respond = (accept: boolean) =>
    start(async () => {
      const r = await respondInvitation({ invitationId, accept });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      if (accept) router.push(`/campaigns/${campaignId}`);
      else router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link href={`/campaigns/${campaignId}`}>View brief</Link>
      </Button>
      <Button size="sm" disabled={pending} onClick={() => respond(true)}>
        Accept & propose
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" disabled={pending}>
            Decline
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this invitation?</AlertDialogTitle>
            <AlertDialogDescription>The brand will be told you declined. You can still apply later if the campaign is open.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => respond(false)}>Decline</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
