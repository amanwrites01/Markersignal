"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { withdrawInvitation } from "@/server/brand";
import { formatDate } from "@/lib/format";

type Invitation = {
  id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  creator_profiles: { display_name: string; slug: string } | null;
};

export function InvitationList({ invitations }: { invitations: Invitation[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!invitations.length) return <EmptyState title="No invitations sent" description="Invite creators from the recommendations above, your shortlist, or any creator profile." />;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {invitations.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <Link href={`/creators/${i.creator_profiles?.slug}`} className="font-medium underline-offset-4 hover:underline">
              {i.creator_profiles?.display_name ?? "Creator"}
            </Link>
            <p className="text-xs text-ink-muted">
              Sent {formatDate(i.created_at)}
              {i.responded_at ? ` · responded ${formatDate(i.responded_at)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={i.status} />
            {i.status === "pending" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await withdrawInvitation(i.id);
                    if (r.ok) {
                      toast.success(r.message);
                      router.refresh();
                    } else toast.error(r.error);
                  })
                }
              >
                Withdraw
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
