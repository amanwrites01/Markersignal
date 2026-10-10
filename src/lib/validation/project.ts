import { z } from "zod";
import { moneyInput, optionalDate, optionalText, optionalUrl } from "./common";

export const uuid = z.string().uuid();

export const scopeSchema = z.object({
  scopeSummary: optionalText(6000),
  startDate: optionalDate,
  dueDate: optionalDate,
}).refine((v) => !v.startDate || !v.dueDate || v.startDate <= v.dueDate, { path: ["dueDate"], message: "Due date must be after the start date" });

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Give the milestone a title").max(140),
  description: optionalText(2000),
  dueDate: optionalDate,
  amount: moneyInput,
  percentage: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        ctx.addIssue({ code: "custom", message: "Use a percentage between 0 and 100" });
        return z.NEVER;
      }
      return n;
    }),
});

export const deliverableSchema = z.object({
  title: z.string().trim().min(1, "Give the deliverable a title").max(140),
  description: optionalText(2000),
  milestoneId: uuid.nullable().optional().or(z.literal("").transform(() => null)),
  deliverableTypeId: z.coerce.number().int().positive().nullable().optional(),
  platformId: z.coerce.number().int().positive().nullable().optional(),
  dueDate: optionalDate,
});

export const versionSchema = z
  .object({
    notes: optionalText(3000),
    storagePath: z.string().max(500).nullable().optional(),
    fileName: z.string().max(255).nullable().optional(),
    mimeType: z.string().max(120).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional(),
    externalUrl: optionalUrl,
  })
  .refine((v) => v.storagePath || v.externalUrl, { path: ["externalUrl"], message: "Upload a file or add a link" });

export const feedbackSchema = z
  .object({
    decision: z.enum(["approved", "revision_requested"]),
    body: optionalText(4000),
  })
  .refine((v) => v.decision === "approved" || (v.body && v.body.length >= 5), { path: ["body"], message: "Explain what should change (at least 5 characters)" });

export const reasonSchema = z.object({ reason: z.string().trim().min(10, "Describe the issue (at least 10 characters)").max(2000) });
export const commentSchema = z.object({ body: z.string().trim().min(1, "Write a comment").max(4000) });
export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  body: optionalText(3000),
});

export type ScopeInput = z.input<typeof scopeSchema>;
export type MilestoneInput = z.input<typeof milestoneSchema>;
export type DeliverableInput = z.input<typeof deliverableSchema>;
export type VersionInput = z.input<typeof versionSchema>;
export type FeedbackInput = z.input<typeof feedbackSchema>;
export type ReasonInput = z.input<typeof reasonSchema>;
export type CommentInput = z.input<typeof commentSchema>;
export type ReviewInput = z.input<typeof reviewSchema>;
