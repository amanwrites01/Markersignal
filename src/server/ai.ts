"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireViewer } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { getCampaignDetail } from "@/lib/data/campaigns";
import {
  briefInputSchema,
  draftPortfolioDescription,
  explainScope,
  generateBrief,
  planSquad,
  reviewBriefCompleteness,
  rewordMatch,
  summariseProposal,
  type BriefOutput,
} from "@/lib/ai/services";
import { saveCampaign } from "./campaigns";

const uuid = z.string().uuid();

export async function runBriefSimulator(input: unknown): Promise<ActionResult<BriefOutput>> {
  await requireRole("brand");
  const parsed = briefInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const result = await generateBrief(supabase, await getTaxonomy(), parsed.data);
  return result.ok ? ok(result.data) : fail(result.message);
}

/** Saves an (edited) simulator result as a DRAFT campaign. Never publishes. */
export async function createDraftFromBrief(
  draft: BriefOutput & { budgetMin?: number | null; budgetMax?: number | null; currency?: string; deadline?: string },
): Promise<ActionResult<{ id: string }>> {
  await requireRole("brand");
  const t = await getTaxonomy();
  const id = (list: { id: number; slug: string }[], slug: string | null | undefined) => (slug ? list.find((x) => x.slug === slug)?.id ?? null : null);
  const description = [
    draft.brief,
    draft.concept ? `\n\nConcept\n${draft.concept}` : "",
    draft.storyboard?.length ? `\n\nOutline\n${draft.storyboard.map((s, i) => `${i + 1}. ${s.step} — ${s.description}`).join("\n")}` : "",
    draft.timeline?.length ? `\n\nTimeline\n${draft.timeline.map((p) => `• ${p.phase}: ${p.days} days${p.notes ? ` — ${p.notes}` : ""}`).join("\n")}` : "",
  ].join("");
  return saveCampaign(null, {
    title: draft.title.slice(0, 140),
    objective: draft.objective.slice(0, 1000),
    description: description.slice(0, 8000),
    productDescription: "",
    targetAudience: draft.targetAudience.slice(0, 2000),
    categoryId: id(t.categories, draft.category),
    industryId: null,
    budgetMin: draft.budgetMin ?? "",
    budgetMax: draft.budgetMax ?? "",
    currency: draft.currency ?? "USD",
    deadline: draft.deadline ?? "",
    applicationDeadline: "",
    locationRequirement: "",
    revisionsExpected: 2,
    usageOrganic: true,
    usagePaidAds: false,
    usageDurationMonths: 12,
    usageTerritory: "Worldwide",
    exclusivityRequired: false,
    rawFilesRequired: false,
    usageNotes: "",
    visibility: "public",
    blindReview: false,
    aiAssisted: true,
    deliverables: draft.deliverables
      .map((d) => ({ deliverableTypeId: id(t.deliverableTypes, d.deliverableType), platformId: id(t.platforms, d.platform), quantity: Math.min(100, Math.max(1, d.quantity)), description: d.notes.slice(0, 1000) }))
      .filter((d) => d.deliverableTypeId != null),
    platformIds: [...new Set(draft.deliverables.map((d) => id(t.platforms, d.platform)).filter((x): x is number => x != null))],
    styleIds: draft.styles.map((s) => id(t.styles, s)).filter((x): x is number => x != null).slice(0, 5),
    skillIds: draft.skills.map((s) => id(t.skills, s)).filter((x): x is number => x != null),
  });
}

export async function aiBriefReview(campaignId: string) {
  const viewer = await requireRole("brand");
  if (!uuid.safeParse(campaignId).success) return fail("Campaign not found.");
  const detail = await getCampaignDetail(campaignId);
  if (!detail || detail.campaign.brand_id !== viewer.id) return fail("Campaign not found.");
  const c = detail.campaign;
  const supabase = await createClient();
  const r = await reviewBriefCompleteness(supabase, campaignId, {
    title: c.title, objective: c.objective, description: c.description, product: c.product_description, audience: c.target_audience,
    deliverables: detail.deliverables.map((d) => `${d.quantity} × ${d.deliverable_types?.name} on ${d.platforms?.name ?? "any platform"}${d.description ? ` (${d.description})` : ""}`),
    budgetMax: c.budget_max_cents != null ? c.budget_max_cents / 100 : null, currency: c.currency, deadline: c.deadline,
    usage: { organic: c.usage_organic, paid: c.usage_paid_ads, months: c.usage_duration_months, territory: c.usage_territory, exclusivity: c.exclusivity_required, rawFiles: c.raw_files_required },
  });
  return r.ok ? ok(r.data) : fail(r.message);
}

export async function aiProposalSummary(proposalId: string) {
  await requireRole("brand");
  if (!uuid.safeParse(proposalId).success) return fail("Proposal not found.");
  const supabase = await createClient();
  // brand_list_proposals only returns the caller's proposals and keeps blind masking.
  const { data: rows } = await supabase.rpc("brand_list_proposals", {});
  const p = rows?.find((r) => r.id === proposalId);
  if (!p) return fail("Proposal not found.");
  const detail = await getCampaignDetail(p.campaign_id);
  const r = await summariseProposal(supabase, proposalId, {
    campaign: {
      objective: detail?.campaign.objective, description: detail?.campaign.description,
      deliverables: detail?.deliverables.map((d) => `${d.quantity} × ${d.deliverable_types?.name}`),
      budgetMax: detail?.campaign.budget_max_cents != null ? detail.campaign.budget_max_cents / 100 : null, deadline: detail?.campaign.deadline,
    },
    proposal: {
      approach: p.approach, timelineDays: p.timeline_days, deliveryDate: p.proposed_delivery_date, quote: p.quote_cents != null ? p.quote_cents / 100 : null,
      currency: p.currency, revisions: p.revisions_included, usageNotes: p.usage_notes, deliverables: p.deliverables, skills: p.skills, styles: p.styles,
    },
  });
  return r.ok ? ok(r.data) : fail(r.message);
}

export async function aiScopeExplanation(payload: unknown) {
  await requireViewer();
  const supabase = await createClient();
  const r = await explainScope(supabase, payload);
  return r.ok ? ok(r.data) : fail(r.message);
}

export async function aiPortfolioDescription(input: { title: string; deliverableType?: string; industry?: string; client?: string; notes?: string }) {
  await requireRole("creator");
  const parsed = z
    .object({ title: z.string().trim().min(1).max(120), deliverableType: z.string().max(80).optional(), industry: z.string().max(80).optional(), client: z.string().max(120).optional(), notes: z.string().max(2000).optional() })
    .safeParse(input);
  if (!parsed.success) return fail("Add a title first.");
  const supabase = await createClient();
  const r = await draftPortfolioDescription(supabase, parsed.data);
  return r.ok ? ok(r.data.description) : fail(r.message);
}

export async function aiSquadPlan(campaignId: string) {
  const viewer = await requireRole("brand");
  if (!uuid.safeParse(campaignId).success) return fail("Campaign not found.");
  const detail = await getCampaignDetail(campaignId);
  if (!detail || detail.campaign.brand_id !== viewer.id) return fail("Campaign not found.");
  const supabase = await createClient();
  const r = await planSquad(supabase, await getTaxonomy(), campaignId, {
    title: detail.campaign.title, objective: detail.campaign.objective, description: detail.campaign.description,
    deliverables: detail.deliverables.map((d) => `${d.quantity} × ${d.deliverable_types?.name}`),
    budgetMax: detail.campaign.budget_max_cents != null ? detail.campaign.budget_max_cents / 100 : null,
    styles: detail.styles.map((s) => s.creative_style_tags?.name),
  });
  return r.ok ? ok(r.data) : fail(r.message);
}

export async function aiMatchExplanation(matchId: string) {
  await requireRole("brand");
  if (!uuid.safeParse(matchId).success) return fail("Match not found.");
  const supabase = await createClient();
  const { data: m } = await supabase.from("match_results").select("id, campaign_id, score, factors, explanation").eq("id", matchId).maybeSingle();
  if (!m) return fail("Match not found.");
  const r = await rewordMatch(supabase, matchId, { score: m.score, factors: m.factors, deterministicExplanation: m.explanation });
  if (!r.ok) return fail(r.message);
  const { error } = await supabase.rpc("set_match_ai_explanation", { p_match_id: matchId, p_text: r.data.text });
  if (error) return fail("Couldn't save the AI summary.");
  revalidatePath(`/brand/campaigns/${m.campaign_id}`);
  return ok(r.data.text, "AI summary added");
}
