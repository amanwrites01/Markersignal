import "server-only";
import { z } from "zod";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Taxonomy } from "@/lib/data/taxonomy";
import { runStructured, userData } from "./client";

const slugEnum = (opts: { slug: string }[]) => z.enum(opts.map((o) => o.slug) as [string, ...string[]]);

// ---------------------------------------------------------------------------
// Brief-to-Reality Simulator
// ---------------------------------------------------------------------------

export const briefInputSchema = z.object({
  objective: z.string().trim().min(10, "Describe the objective in a sentence or two").max(1000),
  product: z.string().trim().max(2000).optional().default(""),
  audience: z.string().trim().max(1000).optional().default(""),
  platforms: z.array(z.string()).max(10).default([]),
  budgetMin: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  budgetMax: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  currency: z.string().default("USD"),
  deadline: z.string().optional().default(""),
  styles: z.array(z.string()).max(5).default([]),
  formats: z.string().trim().max(1000).optional().default(""),
});
export type BriefInput = z.infer<typeof briefInputSchema>;

export function briefOutputSchema(t: Taxonomy) {
  return z.object({
    title: z.string().describe("Short campaign title, under 100 characters"),
    objective: z.string().describe("One or two sentences"),
    brief: z.string().describe("The structured creative brief: context, key message, tone, must-haves, things to avoid"),
    targetAudience: z.string(),
    concept: z.string().describe("A draft content concept"),
    deliverables: z
      .array(
        z.object({
          deliverableType: slugEnum(t.deliverableTypes),
          platform: slugEnum(t.platforms).nullable(),
          quantity: z.number().int(),
          notes: z.string(),
        }),
      )
      .describe("1 to 8 suggested deliverables"),
    storyboard: z.array(z.object({ step: z.string(), description: z.string() })).describe("3 to 8 beats or an outline"),
    timeline: z.array(z.object({ phase: z.string(), days: z.number().int(), notes: z.string() })).describe("Phases from kickoff to delivery"),
    clarifyingQuestions: z.array(z.string()).describe("Questions the brand should answer before publishing"),
    scopeWarnings: z.array(z.string()).describe("Potential scope, timeline or budget mismatches. Empty if none."),
    proposalChecklist: z.array(z.string()).describe("What to look for when evaluating creator proposals"),
    styles: z.array(slugEnum(t.styles)).describe("Up to 5 creative style tags"),
    skills: z.array(slugEnum(t.skills)).describe("Up to 6 relevant skills"),
    category: slugEnum(t.categories).nullable(),
  });
}
export type BriefOutput = z.infer<ReturnType<typeof briefOutputSchema>>;

export async function generateBrief(supabase: ServerSupabase, taxonomy: Taxonomy, input: BriefInput) {
  const reference = {
    deliverableTypes: taxonomy.deliverableTypes.map((d) => `${d.slug} (${d.name})`),
    platforms: taxonomy.platforms.map((p) => `${p.slug} (${p.name})`),
    styles: taxonomy.styles.map((s) => `${s.slug} (${s.name})`),
    skills: taxonomy.skills.map((s) => `${s.slug} (${s.name})`),
    categories: taxonomy.categories.map((c) => `${c.slug} (${c.name})`),
  };
  return runStructured({
    supabase,
    kind: "brief_generation",
    task:
      "Turn the brand's rough campaign idea into an editable structured brief for content creators. Use only the allowed slugs for deliverable types, platforms, styles, skills and categories. Keep quantities realistic for the budget and deadline, and flag any mismatch honestly in scopeWarnings. Do not include performance guarantees.",
    input: [userData("campaign_idea", input), `Allowed reference values:\n${JSON.stringify(reference)}`, `Today's date: ${new Date().toISOString().slice(0, 10)}`].join("\n\n"),
    schema: briefOutputSchema(taxonomy),
    maxTokens: 12000,
  });
}

// ---------------------------------------------------------------------------
// Brief completeness (AI suggestions on top of the deterministic checklist)
// ---------------------------------------------------------------------------

export const completenessSchema = z.object({
  suggestions: z.array(z.object({ field: z.string(), suggestion: z.string() })).describe("Up to 6 specific improvements"),
  ambiguities: z.array(z.string()).describe("Phrases creators could interpret in different ways"),
});

export async function reviewBriefCompleteness(supabase: ServerSupabase, campaignId: string, campaign: unknown) {
  return runStructured({
    supabase,
    kind: "brief_completeness",
    entity: { type: "campaign", id: campaignId },
    task: "Review this campaign brief for completeness and clarity from a creator's point of view. Suggest concrete improvements and point out ambiguous wording.",
    input: userData("campaign", campaign),
    schema: completenessSchema,
    maxTokens: 4000,
  });
}

// ---------------------------------------------------------------------------
// Proposal summarisation
// ---------------------------------------------------------------------------

export const proposalSummarySchema = z.object({
  summary: z.string().describe("Two or three sentences, neutral tone"),
  strengths: z.array(z.string()).describe("Up to 4, tied to the brief"),
  risks: z.array(z.string()).describe("Up to 4 gaps or risks relative to the brief"),
  questions: z.array(z.string()).describe("Up to 4 questions to ask the creator"),
});

export async function summariseProposal(supabase: ServerSupabase, proposalId: string, payload: { campaign: unknown; proposal: unknown }) {
  return runStructured({
    supabase,
    kind: "proposal_summary",
    entity: { type: "proposal", id: proposalId },
    task:
      "Summarise this creator proposal for the brand against the campaign brief. Be balanced and specific. Do not guess the creator's identity, demographics or personal attributes; judge only the proposal content.",
    input: [userData("campaign_brief", payload.campaign), userData("proposal", payload.proposal)].join("\n\n"),
    schema: proposalSummarySchema,
    maxTokens: 3000,
  });
}

// ---------------------------------------------------------------------------
// Scope-to-Price narrative
// ---------------------------------------------------------------------------

export const scopeNarrativeSchema = z.object({
  explanation: z.string().describe("Plain-language explanation of what drives the estimate"),
  scopeGaps: z.array(z.string()).describe("Requirements that are missing or unclear"),
  negotiationQuestions: z.array(z.string()).describe("Up to 5 extra questions for negotiation"),
});

export async function explainScope(supabase: ServerSupabase, payload: unknown) {
  return runStructured({
    supabase,
    kind: "scope_price",
    task:
      "Explain this deterministic scope and price estimate in plain language for both a brand and a creator. Do not invent new prices; refer only to the figures provided and always call them estimates. Never suggest the creator lower their price.",
    input: userData("scope_and_estimate", payload),
    schema: scopeNarrativeSchema,
    maxTokens: 3000,
  });
}

// ---------------------------------------------------------------------------
// Portfolio description assistance
// ---------------------------------------------------------------------------

export const portfolioDescriptionSchema = z.object({
  description: z.string().describe("60–120 words, first person, factual; no invented metrics or clients"),
});

export async function draftPortfolioDescription(supabase: ServerSupabase, payload: { title: string; deliverableType?: string; industry?: string; client?: string; notes?: string }) {
  return runStructured({
    supabase,
    kind: "portfolio_description",
    task:
      "Write a clear portfolio description for this piece of creator work using only the facts provided. Do not invent results, numbers, awards or client names. If facts are thin, keep it short.",
    input: userData("portfolio_piece", payload),
    schema: portfolioDescriptionSchema,
    maxTokens: 1500,
  });
}

// ---------------------------------------------------------------------------
// Squad planning
// ---------------------------------------------------------------------------

export function squadPlanSchema(t: Taxonomy) {
  return z.object({
    roles: z
      .array(
        z.object({
          title: z.string(),
          category: slugEnum(t.categories).nullable(),
          deliverableType: slugEnum(t.deliverableTypes).nullable(),
          skills: z.array(slugEnum(t.skills)),
          budgetSharePercent: z.number().int().describe("Share of the campaign budget, all roles summing to about 100"),
          why: z.string(),
        }),
      )
      .describe("2 to 5 roles"),
    notes: z.array(z.string()).describe("Coordination notes or risks"),
  });
}

export async function planSquad(supabase: ServerSupabase, taxonomy: Taxonomy, campaignId: string, campaign: unknown) {
  return runStructured({
    supabase,
    kind: "squad_plan",
    entity: { type: "campaign", id: campaignId },
    task: "Propose the creator roles needed to deliver this multi-creator campaign. Use only the allowed slugs. Keep the team as small as the deliverables allow.",
    input: [
      userData("campaign", campaign),
      `Allowed values: ${JSON.stringify({
        categories: taxonomy.categories.map((c) => c.slug),
        deliverableTypes: taxonomy.deliverableTypes.map((d) => d.slug),
        skills: taxonomy.skills.map((s) => s.slug),
      })}`,
    ].join("\n\n"),
    schema: squadPlanSchema(taxonomy),
    maxTokens: 4000,
  });
}

// ---------------------------------------------------------------------------
// Match explanation rewording
// ---------------------------------------------------------------------------

export const matchExplanationSchema = z.object({ text: z.string().describe("At most two sentences") });

export async function rewordMatch(supabase: ServerSupabase, matchId: string, payload: unknown) {
  return runStructured({
    supabase,
    kind: "match_explanation",
    entity: { type: "match_result", id: matchId },
    task:
      "Rewrite this match explanation for a brand in at most two friendly sentences, using ONLY the factors provided. Say it is an estimate. Never mention or infer personal attributes.",
    input: userData("match_factors", payload),
    schema: matchExplanationSchema,
    maxTokens: 600,
  });
}
