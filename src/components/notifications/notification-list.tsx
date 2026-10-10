"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/server/notifications";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  if (!items.length) {
    return <EmptyState icon={Bell} title="You're all caught up" description="Invitations, proposals, messages, deadlines and approvals will show up here." />;
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="meta" aria-live="polite">
          {unread ? `${unread} unread` : "All read"}
        </p>
        <Button variant="outline" size="sm" disabled={!unread || pending} onClick={() => run(markAllNotificationsRead)}>
          <CheckCheck aria-hidden /> Mark all as read
        </Button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((n) => (
          <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.read_at && "bg-lime-soft/40")}>
            <span
              className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-forest")}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {n.link_path ? (
                <Link
                  href={n.link_path}
                  onClick={() => {
                    if (!n.read_at) void markNotificationRead(n.id);
                  }}
                  className={cn("underline-offset-4 hover:underline", !n.read_at ? "font-semibold" : "font-medium")}
                >
                  {n.title}
                </Link>
              ) : (
                <p className={!n.read_at ? "font-semibold" : "font-medium"}>{n.title}</p>
              )}
              {!n.read_at ? <span className="sr-only"> (unread)</span> : null}
              {n.body ? <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{n.body}</p> : null}
              <p className="mt-1 text-xs text-ink-muted">
                <time dateTime={n.created_at}>{relativeTime(n.created_at)}</time>
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {!n.read_at ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => markNotificationRead(n.id))}>
                  Mark read
                </Button>
              ) : null}
              <Button variant="ghost" size="icon-sm" aria-label={`Delete notification: ${n.title}`} disabled={pending} onClick={() => run(() => deleteNotification(n.id))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
