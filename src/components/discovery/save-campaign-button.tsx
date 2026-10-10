"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSavedCampaign } from "@/server/creator";

export function SaveCampaignButton({ campaignId, saved, onChange, refreshOnChange }: { campaignId: string; saved: boolean; onChange?: (saved: boolean) => void; refreshOnChange?: boolean }) {
  const router = useRouter();
  const [isSaved, setSaved] = useState(saved);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-pressed={isSaved}
      onClick={() =>
        start(async () => {
          const r = await toggleSavedCampaign(campaignId, !isSaved);
          if (r.ok) {
            setSaved(!isSaved);
            onChange?.(!isSaved);
            toast.success(r.message);
            if (refreshOnChange) router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
