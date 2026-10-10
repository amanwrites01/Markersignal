import type { Metadata } from "next";
import { MessagesView } from "@/components/messages/messages-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Messages" };

export default async function CreatorMessagesPage({ searchParams }: PageProps<"/creator/messages">) {
  const viewer = await requireRole("creator");
  const { c } = await searchParams;
  return <MessagesView viewerId={viewer.id} role="creator" selectedId={typeof c === "string" ? c : undefined} />;
}
