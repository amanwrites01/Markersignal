import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProposalInput } from "@/lib/validation/proposal";

/** Creator's portfolio as sample options for a proposal. */
export async function getSampleOptions(creatorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, title, deliverable_types(name), industries(name)")
    .eq("creator_id", creatorId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    detail: [p.deliverable_types?.name, p.industries?.name].filter(Boolean).join(" · ") || "Portfolio piece",
  }));
}

/** A creator's own proposal with line items and samples (RLS: own rows only). */
export async function getOwnProposal(id: string) {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, campaigns(id, title, status, deadline, application_deadline, budget_min_cents, budget_max_cents, currency, revisions_expected, blind_review, brand_profiles(brand_name, slug))")
    .eq("id", id)
    .maybeSingle();
  if (!proposal) return null;
  const [deliverables, samples, project, conversation] = await Promise.all([
    supabase.from("proposal_deliverables").select("*, deliverable_types(name), platforms(name)").eq("proposal_id", id).order("sort_order"),
    supabase.from("proposal_portfolio_items").select("portfolio_item_id, portfolio_items(title)").eq("proposal_id", id),
    supabase.from("projects").select("id").eq("proposal_id", id).maybeSingle(),
    supabase.from("conversations").select("id").eq("proposal_id", id).maybeSingle(),
  ]);
  return {
    proposal,
    deliverables: deliverables.data ?? [],
    samples: samples.data ?? [],
    projectId: project.data?.id ?? null,
    conversationId: conversation.data?.id ?? null,
  };
}

const money = (c: number | null) => (c == null ? "" : String(c / 100));

export function proposalToInput(d: NonNullable<Awaited<ReturnType<typeof getOwnProposal>>>): ProposalInput {
  const p = d.proposal;
  return {
    approach: p.approach ?? "",
    timelineDays: p.timeline_days,
    proposedDeliveryDate: p.proposed_delivery_date ?? "",
    quote: money(p.quote_cents),
    currency: p.currency as "USD",
    revisionsIncluded: p.revisions_included,
    usageNotes: p.usage_notes ?? "",
    deliverables: d.deliverables.map((x) => ({
      deliverableTypeId: x.deliverable_type_id,
      platformId: x.platform_id,
      quantity: x.quantity,
      description: x.description ?? "",
      price: money(x.price_cents),
    })),
    portfolioItemIds: d.samples.map((s) => s.portfolio_item_id),
  };
}

/** Whether a campaign currently accepts new proposals (mirrors submit_proposal's checks). */
export function campaignAcceptsProposals(c: { status: string; application_deadline: string | null }) {
  if (c.status !== "published") return { open: false, reason: c.status === "paused" ? "The brand has paused applications." : "This campaign isn't accepting proposals." };
  if (c.application_deadline && c.application_deadline < new Date().toISOString().slice(0, 10)) return { open: false, reason: "The application deadline has passed." };
  return { open: true, reason: null as string | null };
}
