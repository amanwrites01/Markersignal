import type { Metadata } from "next";
import { MessagesView } from "@/components/messages/messages-view";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Messages" };

export default async function BrandMessagesPage({ searchParams }: PageProps<"/brand/messages">) {
  const viewer = await requireRole("brand");
  const { c } = await searchParams;
  return <MessagesView viewerId={viewer.id} role="brand" selectedId={typeof c === "string" ? c : undefined} />;
}
