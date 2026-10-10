import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Unread notifications and conversations with unread messages, for the shell badges. */
export const getUnreadCounts = cache(async (userId: string) => {
  const supabase = await createClient();
  const [notifications, memberships] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null),
    supabase.from("conversation_members").select("last_read_at, conversations!inner(last_message_at)").eq("profile_id", userId),
  ]);
  const unreadConversations = (memberships.data ?? []).filter((m) => {
    const last = m.conversations?.last_message_at;
    return last && (!m.last_read_at || Date.parse(last) > Date.parse(m.last_read_at));
  }).length;
  return { notifications: notifications.count ?? 0, messages: unreadConversations };
});
