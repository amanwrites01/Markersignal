"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { inviteCreator, toggleShortlist } from "@/server/brand";

export type InviteCampaign = { id: string; title: string };

export function ShortlistButton({ creatorId, saved, size = "default" }: { creatorId: string; saved: boolean; size?: "default" | "sm" }) {
  const [isSaved, setSaved] = useState(saved);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size={size}
      disabled={pending}
      aria-pressed={isSaved}
      onClick={() =>
        start(async () => {
          const r = await toggleShortlist(creatorId, !isSaved);
          if (r.ok) {
            setSaved(!isSaved);
            toast.success(r.message);
          } else toast.error(r.error);
        })
      }
    >
      {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {isSaved ? "Shortlisted" : "Shortlist"}
    </Button>
  );
}

export function InviteButton({
  creatorId,
  creatorName,
  campaigns,
  defaultCampaignId,
  squadRoleId,
  size = "default",
}: {
  creatorId: string;
  creatorName: string;
  campaigns: InviteCampaign[];
  defaultCampaignId?: string;
  squadRoleId?: string | null;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? campaigns[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Send aria-hidden /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {creatorName}</DialogTitle>
          <DialogDescription>An invitation asks the creator to send a proposal. Nothing is agreed until you accept one.</DialogDescription>
        </DialogHeader>
        {campaigns.length === 0 ? (
          <div className="grid gap-3 text-sm">
            <p>You need a published campaign to invite creators.</p>
            <Button asChild variant="outline">
              <Link href="/brand/campaigns/new">Create a campaign</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <Field label="Campaign" htmlFor="invite-campaign">
              <NativeSelect value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Message" htmlFor="invite-message" optional hint="Why you think they're a fit — creators respond better to specific invitations.">
              <Textarea rows={4} maxLength={2000} placeholder="e.g. Loved your juice launch reels — we’d like a similar feel for our serum." value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
        {campaigns.length ? (
          <DialogFooter>
            <Button
              disabled={pending || !campaignId}
              onClick={() =>
                start(async () => {
                  const r = await inviteCreator({ campaignId, creatorId, message, squadRoleId: squadRoleId ?? null });
                  if (r.ok) {
                    toast.success(r.message);
                    setOpen(false);
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Send invitation
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
