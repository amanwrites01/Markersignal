"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import {
  commentSchema,
  deliverableSchema,
  feedbackSchema,
  milestoneSchema,
  reasonSchema,
  reviewSchema,
  scopeSchema,
  uuid,
  versionSchema,
} from "@/lib/validation/project";
import { limitByUser } from "./rate-limit";

/** Membership is enforced by RLS and the workflow functions; this just resolves the caller's side for paths. */
async function context(projectId: string) {
  const viewer = await requireViewer();
  if (!uuid.safeParse(projectId).success) return null;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("project_members")
    .select("member_role")
    .eq("project_id", projectId)
    .eq("profile_id", viewer.id)
    .maybeSingle();
  if (!member) return null;
  return { viewer, supabase, role: member.member_role as "brand" | "creator" };
}

function refresh(projectId: string) {
  revalidatePath(`/creator/projects/${projectId}`);
  revalidatePath(`/brand/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/rights`);
  revalidatePath("/creator/projects");
  revalidatePath("/brand/projects");
}

const NOT_FOUND = "Project not found.";

export async function updateScope(projectId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = scopeSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const { data, error } = await ctx.supabase
    .from("projects")
    .update({ scope_summary: parsed.data.scopeSummary ?? null, start_date: parsed.data.startDate, due_date: parsed.data.dueDate })
    .eq("id", projectId)
    .select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Scope can only be edited before both parties agree.");
  refresh(projectId);
  return ok(undefined, "Scope updated — both parties need to confirm again.");
}

export async function agreeScope(projectId: string): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.rpc("agree_project_scope", { p_project_id: projectId });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "You've confirmed the scope.");
}

export async function saveMilestone(projectId: string, milestoneId: string | null, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const row = { title: v.title, description: v.description ?? null, due_date: v.dueDate, amount_cents: v.amount, percentage: v.percentage };
  if (milestoneId) {
    if (!uuid.safeParse(milestoneId).success) return fail("Milestone not found.");
    const { data, error } = await ctx.supabase.from("project_milestones").update(row).eq("id", milestoneId).eq("project_id", projectId).select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("Approved milestones can't be edited.");
  } else {
    const { count } = await ctx.supabase.from("project_milestones").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    const { error } = await ctx.supabase
      .from("project_milestones")
      .insert({ ...row, project_id: projectId, created_by: ctx.viewer.id, sort_order: count ?? 0 });
    if (error) return fail(dbError(error));
  }
  refresh(projectId);
  return ok(undefined, milestoneId ? "Milestone updated" : "Milestone added");
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx || !uuid.safeParse(milestoneId).success) return fail(NOT_FOUND);
  const { data, error } = await ctx.supabase.from("project_milestones").delete().eq("id", milestoneId).eq("project_id", projectId).select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Only pending milestones without submitted work can be removed.");
  refresh(projectId);
  return ok(undefined, "Milestone removed");
}

export async function saveDeliverable(projectId: string, deliverableId: string | null, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = deliverableSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const row = {
    title: v.title,
    description: v.description ?? null,
    milestone_id: v.milestoneId ?? null,
    deliverable_type_id: v.deliverableTypeId ?? null,
    platform_id: v.platformId ?? null,
    due_date: v.dueDate,
  };
  if (deliverableId) {
    if (!uuid.safeParse(deliverableId).success) return fail("Deliverable not found.");
    const { data, error } = await ctx.supabase.from("deliverables").update(row).eq("id", deliverableId).eq("project_id", projectId).select("id");
    if (error) return fail(dbError(error));
    if (!data?.length) return fail("Approved deliverables can't be edited.");
  } else {
    const { error } = await ctx.supabase.from("deliverables").insert({ ...row, project_id: projectId, created_by: ctx.viewer.id });
    if (error) return fail(dbError(error));
  }
  refresh(projectId);
  return ok(undefined, deliverableId ? "Deliverable updated" : "Deliverable added");
}

export async function deleteDeliverable(projectId: string, deliverableId: string): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx || !uuid.safeParse(deliverableId).success) return fail(NOT_FOUND);
  const { data, error } = await ctx.supabase.from("deliverables").delete().eq("id", deliverableId).eq("project_id", projectId).select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("Deliverables with submitted versions can't be removed.");
  refresh(projectId);
  return ok(undefined, "Deliverable removed");
}

export async function submitVersion(projectId: string, deliverableId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx || !uuid.safeParse(deliverableId).success) return fail(NOT_FOUND);
  if (ctx.role !== "creator") return fail("Only the creator can submit deliverables.");
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  if (v.storagePath && (!v.storagePath.startsWith(`${projectId}/`) || v.storagePath.includes(".."))) return fail("Invalid upload.");
  if (!(await limitByUser(ctx.supabase, "deliverable_submit", 60, 3600))) return fail("Too many submissions. Please try again later.");
  const { error } = await ctx.supabase.rpc("submit_deliverable_version", {
    p_deliverable_id: deliverableId,
    p_notes: (v.notes ?? null) as string,
    p_storage_path: (v.storagePath ?? null) as string,
    p_file_name: (v.fileName ?? null) as string,
    p_mime_type: (v.mimeType ?? null) as string,
    p_size_bytes: (v.sizeBytes ?? null) as number,
    p_external_url: (v.externalUrl ?? null) as string,
  });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "New version submitted for review");
}

export async function reviewDeliverable(projectId: string, deliverableId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx || !uuid.safeParse(deliverableId).success) return fail(NOT_FOUND);
  if (ctx.role !== "brand") return fail("Only the brand can review deliverables.");
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const { error } = await ctx.supabase.rpc("review_deliverable", {
    p_deliverable_id: deliverableId,
    p_decision: parsed.data.decision,
    p_body: (parsed.data.body ?? null) as string,
  });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, parsed.data.decision === "approved" ? "Deliverable approved" : "Revision requested");
}

export async function addComment(projectId: string, input: unknown, deliverableId?: string | null): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return fail("Write a comment.", parsed.error.flatten().fieldErrors);
  if (deliverableId && !uuid.safeParse(deliverableId).success) return fail("Deliverable not found.");
  if (!(await limitByUser(ctx.supabase, "comment", 120, 3600))) return fail("You're commenting very quickly. Please wait a moment.");
  const { error } = await ctx.supabase
    .from("project_comments")
    .insert({ project_id: projectId, author_id: ctx.viewer.id, body: parsed.data.body, deliverable_id: deliverableId ?? null });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Comment posted");
}

export async function completeProject(projectId: string): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.rpc("complete_project", { p_project_id: projectId });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Project completed");
}

export async function cancelProject(projectId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = reasonSchema.safeParse(input);
  if (!parsed.success) return fail("Give a reason.", parsed.error.flatten().fieldErrors);
  const { error } = await ctx.supabase.rpc("cancel_project", { p_project_id: projectId, p_reason: parsed.data.reason });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Project cancelled");
}

export async function disputeProject(projectId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = reasonSchema.safeParse(input);
  if (!parsed.success) return fail("Describe the issue.", parsed.error.flatten().fieldErrors);
  const { error } = await ctx.supabase.rpc("dispute_project", { p_project_id: projectId, p_reason: parsed.data.reason });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Dispute raised. Work is paused until it's resolved.");
}

export async function resolveDispute(projectId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = reasonSchema.safeParse(input);
  if (!parsed.success) return fail("Describe how it was resolved.", parsed.error.flatten().fieldErrors);
  const { error } = await ctx.supabase.rpc("resolve_project_dispute", { p_project_id: projectId, p_note: parsed.data.reason });
  if (error) return fail(dbError(error));
  refresh(projectId);
  return ok(undefined, "Dispute resolved — the project is active again.");
}

export async function submitReview(projectId: string, input: unknown): Promise<ActionResult> {
  const ctx = await context(projectId);
  if (!ctx) return fail(NOT_FOUND);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a rating.", parsed.error.flatten().fieldErrors);
  const { error } = await ctx.supabase.rpc("submit_review", {
    p_project_id: projectId,
    p_rating: parsed.data.rating,
    p_body: (parsed.data.body ?? null) as string,
  });
  if (error) return fail(dbError(error));
  refresh(projectId);
  revalidatePath("/creators/[slug]", "page");
  return ok(undefined, "Thanks — your review is published.");
}
