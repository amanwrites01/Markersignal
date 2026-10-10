import { z } from "zod";
import { currencySchema, moneyInput, optionalDate, optionalText } from "./common";

export const proposalDeliverableSchema = z.object({
  deliverableTypeId: z.coerce.number().int().positive({ message: "Choose a deliverable type" }),
  platformId: z.coerce.number().int().positive().nullable().optional(),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100),
  description: optionalText(1000),
  price: moneyInput,
});

export const proposalSchema = z.object({
  approach: z.string().trim().max(6000, "Keep this under 6000 characters"),
  timelineDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
  proposedDeliveryDate: optionalDate,
  quote: moneyInput,
  currency: currencySchema,
  revisionsIncluded: z.coerce.number().int().min(0).max(20).nullable().optional(),
  usageNotes: optionalText(2000),
  deliverables: z.array(proposalDeliverableSchema).max(30),
  portfolioItemIds: z.array(z.string().uuid()).max(6, "Attach up to 6 samples"),
});

export type ProposalInput = z.input<typeof proposalSchema>;
export type ProposalValues = z.output<typeof proposalSchema>;

/** Requirements the database enforces on submit — checked early for friendlier errors. */
export function submitProblems(v: { approach?: string | null; quote?: number | null; deliverableCount: number }): string[] {
  const out: string[] = [];
  if (!v.approach || v.approach.trim().length < 30) out.push("Describe your approach (at least 30 characters).");
  if (v.quote == null) out.push("Add a quotation.");
  if (v.deliverableCount === 0) out.push("List at least one deliverable.");
  return out;
}
