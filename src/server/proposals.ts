"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { proposalSchema } from "@/lib/validation/proposal";
import { limitByUser } from "./rate-limit";

const uuid = z.string().uuid();

function revalidateProposals(campaignId?: string) {
  revalidatePath("/creator/proposals", "layout");
  revalidatePath("/brand/proposals");
  revalidatePath("/creator/dashboard");
  revalidatePath("/brand/dashboard");
  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/brand/campaigns/${campaignId}`);
  }
}

/** Creates or updates a DRAFT proposal. Submitting is a separate, explicit step. */
export async function saveProposalDraft(
  proposalId: string | null,
  campaignId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireRole("creator");
  if (!uuid.safeParse(campaignId).success || (proposalId && !uuid.safeParse(proposalId).success)) return fail("Not found.");
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const v = parsed.data;
  const supabase = await createClient();

  const row = {
    approach: v.approach || null,
    timeline_days: v.timelineDays ?? null,
    proposed_delivery_date: v.proposedDeliveryDate,
    quote_cents: v.quote,
    currency: v.currency,
    revisions_included: v.revisionsIncluded ?? null,
    usage_notes: v.usageNotes ?? null,
  };

  let id = proposalId;
  if (id) {
    const { data, error } = await supabase.from("proposals").update(row).eq("id", id).eq("creator_id", viewer.id).eq("status", "draft").select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("Only draft proposals can be edited.");
  } else {
    const { data: existing } = await supabase.from("proposals").select("id, status").eq("campaign_id", campaignId).eq("creator_id", viewer.id).maybeSingle();
    if (existing) return fail(existing.status === "draft" ? "You already have a draft for this campaign." : "You've already sent a proposal for this campaign.");
    const { data: invitation } = await supabase
      .from("campaign_invitations")
      .select("id, squad_role_id")
      .eq("campaign_id", campaignId)
      .eq("creator_id", viewer.id)
      .maybeSingle();
    const { data, error } = await supabase
      .from("proposals")
      .insert({ ...row, campaign_id: campaignId, creator_id: viewer.id, invitation_id: invitation?.id ?? null, squad_role_id: invitation?.squad_role_id ?? null })
      .select("id")
      .single();
    if (error) return fail(error.code === "42501" ? "This campaign isn't open to you." : dbError(error));
    id = data.id;
  }

  // Replace line items and samples.
  const delD = await supabase.from("proposal_deliverables").delete().eq("proposal_id", id!);
  if (delD.error) return fail(dbError(delD.error));
  if (v.deliverables.length) {
    const { error } = await supabase.from("proposal_deliverables").insert(
      v.deliverables.map((d, i) => ({
        proposal_id: id!,
        deliverable_type_id: d.deliverableTypeId,
        platform_id: d.platformId ?? null,
        quantity: d.quantity,
        description: d.description ?? null,
        price_cents: d.price,
        sort_order: i,
      })),
    );
    if (error) return fail(dbError(error));
  }
  const delS = await supabase.from("proposal_portfolio_items").delete().eq("proposal_id", id!);
  if (delS.error) return fail(dbError(delS.error));
  if (v.portfolioItemIds.length) {
    const { error } = await supabase
      .from("proposal_portfolio_items")
      .insert([...new Set(v.portfolioItemIds)].map((pid) => ({ proposal_id: id!, portfolio_item_id: pid })));
    if (error) return fail(error.code === "42501" ? "You can only attach your own portfolio pieces." : dbError(error));
  }

  revalidateProposals(campaignId);
  return ok({ id: id! }, "Draft saved");
}

export async function submitProposal(proposalId: string): Promise<ActionResult> {
  await requireRole("creator");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  if (!(await limitByUser(supabase, "proposal-submit", 20, 3600))) return fail("You've submitted many proposals recently. Please try again later.");
  const { data: p } = await supabase.from("proposals").select("campaign_id").eq("id", proposalId).maybeSingle();
  const { error } = await supabase.rpc("submit_proposal", { p_proposal_id: proposalId });
  if (error) return fail(dbError(error));
  revalidateProposals(p?.campaign_id);
  return ok(undefined, "Proposal sent to the brand");
}

export async function withdrawProposal(proposalId: string): Promise<ActionResult> {
  await requireRole("creator");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { data: p } = await supabase.from("proposals").select("campaign_id").eq("id", proposalId).maybeSingle();
  const { error } = await supabase.rpc("withdraw_proposal", { p_proposal_id: proposalId });
  if (error) return fail(dbError(error));
  revalidateProposals(p?.campaign_id);
  return ok(undefined, "Proposal withdrawn");
}

export async function deleteProposalDraft(proposalId: string): Promise<ActionResult> {
  const viewer = await requireRole("creator");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("proposals").delete().eq("id", proposalId).eq("creator_id", viewer.id).eq("status", "draft").select("campaign_id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Only drafts can be deleted.");
  revalidateProposals(data[0]!.campaign_id);
  return ok(undefined, "Draft deleted");
}

/** Opens (or returns) the proposal conversation. Not available for unrevealed blind proposals. */
export async function openProposalConversation(proposalId: string): Promise<ActionResult<{ conversationId: string }>> {
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_proposal_conversation", { p_proposal_id: proposalId });
  if (error) return fail(dbError(error));
  return ok({ conversationId: data as string });
}

// ---------------------------------------------------------------------------
// Brand decisions
// ---------------------------------------------------------------------------

export async function markUnderReview(proposalId: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_proposal_under_review", { p_proposal_id: proposalId });
  if (error) return fail(dbError(error));
  revalidateProposals();
  return ok(undefined, "Marked as under review — the creator has been notified");
}

export async function rejectProposal(proposalId: string, note?: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_proposal", { p_proposal_id: proposalId, p_note: note?.trim().slice(0, 2000) || undefined });
  if (error) return fail(dbError(error));
  revalidateProposals();
  return ok(undefined, "Proposal declined — the creator has been notified");
}

export async function revealIdentity(proposalId: string): Promise<ActionResult> {
  await requireRole("brand");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reveal_proposal_identity", { p_proposal_id: proposalId });
  if (error) return fail(dbError(error));
  revalidateProposals();
  return ok(undefined, "Creator identity revealed");
}

export async function acceptProposal(proposalId: string, note?: string): Promise<ActionResult<{ projectId: string }>> {
  await requireRole("brand");
  if (!uuid.safeParse(proposalId).success) return fail("Not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_proposal", { p_proposal_id: proposalId, p_note: note?.trim().slice(0, 2000) || undefined });
  if (error) return fail(dbError(error));
  revalidateProposals();
  revalidatePath("/brand/projects");
  revalidatePath("/creator/projects");
  return ok({ projectId: data as string }, "Proposal accepted — project created");
}
