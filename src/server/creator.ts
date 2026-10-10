"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { ownsStoragePath } from "@/lib/validation/common";
import { portfolioItemSchema, serviceSchema } from "@/lib/validation/creator";

const uuid = z.string().uuid();

function revalidateCreator() {
  revalidatePath("/creator", "layout");
  revalidatePath("/creators/[slug]", "page");
  revalidatePath("/explore/creators");
}

export async function savePortfolioItem(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireRole("creator");
  const parsed = portfolioItemSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  if (!ownsStoragePath(v.mediaPath, viewer.id)) return fail("Invalid upload.");
  if (id && !uuid.safeParse(id).success) return fail("Not found.");

  const supabase = await createClient();
  const row = {
    title: v.title,
    description: v.description ?? null,
    category_id: v.categoryId ?? null,
    deliverable_type_id: v.deliverableTypeId ?? null,
    platform_id: v.platformId ?? null,
    industry_id: v.industryId ?? null,
    client_name: v.clientName ?? null,
    media_type: v.mediaType,
    media_path: v.mediaPath ?? null,
    external_url: v.externalUrl ?? null,
  };

  if (id) {
    const { data, error } = await supabase.from("portfolio_items").update(row).eq("id", id).eq("creator_id", viewer.id).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("Portfolio item not found.");
    revalidateCreator();
    return ok({ id: data.id }, "Portfolio item updated");
  }
  const { count } = await supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("creator_id", viewer.id);
  if ((count ?? 0) >= 60) return fail("You can show up to 60 portfolio pieces. Remove one to add another.");
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({ ...row, creator_id: viewer.id, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error) return fail(dbError(error));
  revalidateCreator();
  return ok({ id: data.id }, "Added to your portfolio");
}

export async function deletePortfolioItem(id: string): Promise<ActionResult> {
  const viewer = await requireRole("creator");
  if (!uuid.safeParse(id).success) return fail("Not found.");
  const supabase = await createClient();
  const { data: item } = await supabase.from("portfolio_items").select("media_path").eq("id", id).eq("creator_id", viewer.id).maybeSingle();
  if (!item) return fail("Portfolio item not found.");
  const { error } = await supabase.from("portfolio_items").delete().eq("id", id).eq("creator_id", viewer.id);
  if (error) return fail(dbError(error));
  if (item.media_path) await supabase.storage.from("portfolio").remove([item.media_path]);
  revalidateCreator();
  return ok(undefined, "Removed from portfolio");
}

export async function reorderPortfolio(ids: string[]): Promise<ActionResult> {
  const viewer = await requireRole("creator");
  const parsed = z.array(uuid).max(60).safeParse(ids);
  if (!parsed.success) return fail("Invalid order.");
  const supabase = await createClient();
  for (const [i, id] of parsed.data.entries()) {
    const { error } = await supabase.from("portfolio_items").update({ sort_order: i }).eq("id", id).eq("creator_id", viewer.id);
    if (error) return fail(dbError(error));
  }
  revalidateCreator();
  return ok(undefined);
}

export async function saveService(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const viewer = await requireRole("creator");
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  if (id && !uuid.safeParse(id).success) return fail("Not found.");
  const v = parsed.data;
  const row = {
    title: v.title,
    description: v.description ?? null,
    deliverable_type_id: v.deliverableTypeId ?? null,
    starting_price_cents: v.startingPrice,
    currency: v.currency,
    turnaround_days: v.turnaroundDays ?? null,
    revisions_included: v.revisionsIncluded ?? null,
    active: v.active,
  };
  const supabase = await createClient();
  if (id) {
    const { data, error } = await supabase.from("creator_services").update(row).eq("id", id).eq("creator_id", viewer.id).select("id").maybeSingle();
    if (error) return fail(dbError(error));
    if (!data) return fail("Service not found.");
    revalidateCreator();
    return ok({ id: data.id }, "Service updated");
  }
  const { count } = await supabase.from("creator_services").select("id", { count: "exact", head: true }).eq("creator_id", viewer.id);
  if ((count ?? 0) >= 20) return fail("You can list up to 20 services.");
  const { data, error } = await supabase.from("creator_services").insert({ ...row, creator_id: viewer.id }).select("id").single();
  if (error) return fail(dbError(error));
  revalidateCreator();
  return ok({ id: data.id }, "Service added");
}

export async function deleteService(id: string): Promise<ActionResult> {
  const viewer = await requireRole("creator");
  if (!uuid.safeParse(id).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = await supabase.from("creator_services").delete().eq("id", id).eq("creator_id", viewer.id);
  if (error) return fail(dbError(error));
  revalidateCreator();
  return ok(undefined, "Service removed");
}

export async function toggleSavedCampaign(campaignId: string, save: boolean): Promise<ActionResult> {
  const viewer = await requireRole("creator");
  if (!uuid.safeParse(campaignId).success) return fail("Not found.");
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_campaigns").upsert({ creator_id: viewer.id, campaign_id: campaignId }, { onConflict: "creator_id,campaign_id", ignoreDuplicates: true })
    : await supabase.from("saved_campaigns").delete().eq("creator_id", viewer.id).eq("campaign_id", campaignId);
  if (error) return fail(dbError(error));
  revalidatePath("/creator/saved");
  revalidatePath(`/campaigns/${campaignId}`);
  return ok(undefined, save ? "Campaign saved" : "Removed from saved");
}
