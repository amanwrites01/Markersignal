import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";

/** Stable link used in notifications; sends users to their role's inbox. */
export default async function ConversationRedirect({ params }: PageProps<"/messages/[conversationId]">) {
  const viewer = await requireViewer();
  const { conversationId } = await params;
  const role = viewer.profile.role === "brand" ? "brand" : "creator";
  redirect(`/${role}/messages?c=${encodeURIComponent(conversationId)}`);
}
