"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { createGroupSchema, addGroupMembersSchema } from "@/lib/validation/messages";
import { limitByUser } from "./rate-limit";

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a message").max(5000, "Keep messages under 5,000 characters"),
});

export async function sendMessage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireViewer();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return fail("Check your message.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "message", 60, 300))) return fail("You're sending messages very quickly. Please wait a moment.");
  // RLS only allows inserts into conversations the sender is a member of.
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: parsed.data.conversationId, sender_id: viewer.id, body: parsed.data.body })
    .select("id")
    .single();
  if (error) {
    if (error.code === "42501") return fail("You can't send messages in this conversation.");
    return fail(dbError(error));
  }
  revalidatePath("/creator/messages");
  revalidatePath("/brand/messages");
  return ok({ id: data.id });
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const viewer = await requireViewer();
  if (!z.string().uuid().safeParse(conversationId).success) return fail("Not found.");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: now })
    .eq("conversation_id", conversationId)
    .eq("profile_id", viewer.id);
  if (error) return fail(dbError(error));
  // Message notifications for this conversation are now read too.
  await supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("recipient_id", viewer.id)
    .eq("type", "message_received")
    .eq("entity_id", conversationId)
    .is("read_at", null);
  return ok(undefined);
}

/** Create a group conversation of creators initiated by a brand. */
export async function createCreatorGroup(input: unknown): Promise<ActionResult<{ conversationId: string }>> {
  const viewer = await requireRole("brand");
  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) return fail("Check group details.", parsed.error.flatten().fieldErrors);

  const { name, creatorIds, campaignId, initialMessage } = parsed.data;
  const uniqueCreatorIds = [...new Set(creatorIds)].filter((id) => id !== viewer.id);
  if (uniqueCreatorIds.length === 0) return fail("Select at least 1 creator for the group.");

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Create conversation with subject
  const { data: conv, error: convError } = await admin
    .from("conversations")
    .insert({
      subject: `Group: ${name}`,
      campaign_id: campaignId || null,
      created_at: now,
      last_message_at: now,
    })
    .select("id")
    .single();

  if (convError || !conv) {
    return fail(convError ? dbError(convError) : "Failed to create group conversation.");
  }

  // 2. Add brand + creators as conversation members
  const membersToInsert = [
    { conversation_id: conv.id, profile_id: viewer.id, last_read_at: now },
    ...uniqueCreatorIds.map((cId) => ({
      conversation_id: conv.id,
      profile_id: cId,
      last_read_at: null,
    })),
  ];

  const { error: memError } = await admin.from("conversation_members").insert(membersToInsert);
  if (memError) {
    // Clean up conversation if member insertion fails
    await admin.from("conversations").delete().eq("id", conv.id);
    return fail(dbError(memError));
  }

  // 3. Post initial message if provided (triggers notifications for all creators)
  if (initialMessage && initialMessage.trim().length > 0) {
    const { error: msgError } = await admin.from("messages").insert({
      conversation_id: conv.id,
      sender_id: viewer.id,
      body: initialMessage.trim(),
    });
    if (msgError) {
      console.error("Initial group message error:", msgError);
    }
  }

  revalidatePath("/brand/messages");
  revalidatePath("/creator/messages");
  return ok({ conversationId: conv.id }, "Group created successfully");
}

/** Add additional creators to an existing group conversation. */
export async function addCreatorsToGroup(input: unknown): Promise<ActionResult> {
  const viewer = await requireRole("brand");
  const parsed = addGroupMembersSchema.safeParse(input);
  if (!parsed.success) return fail("Check creator selection.", parsed.error.flatten().fieldErrors);

  const { conversationId, creatorIds } = parsed.data;
  const admin = createAdminClient();

  // Check viewer membership
  const { data: member } = await admin
    .from("conversation_members")
    .select("profile_id")
    .eq("conversation_id", conversationId)
    .eq("profile_id", viewer.id)
    .maybeSingle();

  if (!member) return fail("You don't have access to this conversation.");

  // Find existing members
  const { data: existing } = await admin
    .from("conversation_members")
    .select("profile_id")
    .eq("conversation_id", conversationId);

  const existingSet = new Set((existing ?? []).map((m) => m.profile_id));
  const newIds = [...new Set(creatorIds)].filter((id) => !existingSet.has(id));

  if (newIds.length === 0) return fail("All selected creators are already in this group.");

  const membersToInsert = newIds.map((id) => ({
    conversation_id: conversationId,
    profile_id: id,
    last_read_at: null,
  }));

  const { error: insertError } = await admin.from("conversation_members").insert(membersToInsert);
  if (insertError) return fail(dbError(insertError));

  // Get names to announce addition
  const { data: newCreators } = await admin
    .from("creator_profiles")
    .select("display_name")
    .in("id", newIds);

  const names = (newCreators ?? []).map((c) => c.display_name).join(", ");
  if (names) {
    await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: viewer.id,
      body: `Added ${names} to the group.`,
    });
  }

  revalidatePath("/brand/messages");
  revalidatePath("/creator/messages");
  return ok(undefined, "Creators added to group");
}
