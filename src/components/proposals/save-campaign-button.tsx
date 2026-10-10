"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSavedCampaign } from "@/server/creator";

export function SaveCampaignButton({ campaignId, saved }: { campaignId: string; saved: boolean }) {
  const [isSaved, setSaved] = useState(saved);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      aria-pressed={isSaved}
      onClick={() =>
        start(async () => {
          const r = await toggleSavedCampaign(campaignId, !isSaved);
          if (r.ok) {
            setSaved(!isSaved);
            toast.success(r.message);
          } else toast.error(r.error);
        })
      }
    >
      {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
