import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const supabase = await createClient();
  // Creates any due-soon deadline reminders for this user (idempotent).
  await supabase.rpc("refresh_my_deadline_notifications");
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link_path, read_at, created_at")
    .eq("recipient_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <PageHeader title="Notifications" description="Updates on invitations, proposals, messages, deadlines and approvals." />
      <NotificationList items={data ?? []} />
    </>
  );
}
