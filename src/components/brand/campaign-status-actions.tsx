"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CAMPAIGN_TRANSITIONS } from "@/lib/validation/campaign";
import { deleteDraftCampaign, transitionCampaign } from "@/server/campaigns";

const CONFIRM: Record<string, string> = {
  published: "Publishing makes this campaign visible according to its visibility setting and lets creators send proposals.",
  closed: "Closing stops new proposals and withdraws pending invitations. Existing projects continue.",
  archived: "Archived campaigns are hidden from your active list. This can't be undone.",
  paused: "Creators can still see the campaign but can't send new proposals until you resume.",
};

export function CampaignStatusActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (to: string) =>
    start(async () => {
      const r = await transitionCampaign(id, to);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {["draft", "published", "paused"].includes(status) ? (
        <Button asChild variant="outline">
          <Link href={`/brand/campaigns/${id}/edit`}>
            <Pencil aria-hidden /> Edit
          </Link>
        </Button>
      ) : null}
      {status === "draft" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-danger hover:text-danger" disabled={pending}>
              Delete draft
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
              <AlertDialogDescription>The draft and its requirements will be permanently deleted.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  start(async () => {
                    const r = await deleteDraftCampaign(id);
                    if (r && !r.ok) toast.error(r.error);
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {(CAMPAIGN_TRANSITIONS[status] ?? []).map((t) => (
        <AlertDialog key={t.to}>
          <AlertDialogTrigger asChild>
            <Button variant={t.to === "published" ? "default" : t.tone === "danger" ? "outline" : "secondary"} disabled={pending}>
              {t.label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.label}?</AlertDialogTitle>
              <AlertDialogDescription>{CONFIRM[t.to]}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(t.to)}>{t.label}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
