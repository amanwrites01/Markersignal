import { z } from "zod";
import { currencySchema, idList, moneyInput, optionalDate, optionalText } from "./common";

export const CAMPAIGN_VISIBILITY = ["public", "members", "invite_only"] as const;

export const campaignDeliverableSchema = z.object({
  deliverableTypeId: z.coerce.number().int().positive({ message: "Choose a deliverable type" }),
  platformId: z.coerce.number().int().positive().nullable().optional(),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100),
  description: optionalText(1000),
});

export const campaignSchema = z
  .object({
    title: z.string().trim().min(3, "Give the campaign a title").max(140),
    objective: optionalText(1000),
    description: optionalText(8000),
    productDescription: optionalText(3000),
    targetAudience: optionalText(2000),
    categoryId: z.coerce.number().int().positive().nullable().optional(),
    industryId: z.coerce.number().int().positive().nullable().optional(),
    budgetMin: moneyInput,
    budgetMax: moneyInput,
    currency: currencySchema,
    deadline: optionalDate,
    applicationDeadline: optionalDate,
    locationRequirement: optionalText(200),
    revisionsExpected: z.coerce.number().int().min(0).max(20).nullable().optional(),
    usageOrganic: z.boolean(),
    usagePaidAds: z.boolean(),
    usageDurationMonths: z.coerce.number().int().min(1).max(120).nullable().optional(),
    usageTerritory: optionalText(200),
    exclusivityRequired: z.boolean(),
    rawFilesRequired: z.boolean(),
    usageNotes: optionalText(2000),
    visibility: z.enum(CAMPAIGN_VISIBILITY),
    blindReview: z.boolean(),
    aiAssisted: z.boolean().default(false),
    deliverables: z.array(campaignDeliverableSchema).max(30),
    platformIds: idList,
    styleIds: idList.max(5, "Pick up to 5 styles"),
    skillIds: idList,
  })
  .refine((v) => v.budgetMin == null || v.budgetMax == null || v.budgetMin <= v.budgetMax, {
    path: ["budgetMax"],
    message: "Maximum must be at least the minimum",
  })
  .refine((v) => !v.applicationDeadline || !v.deadline || v.applicationDeadline <= v.deadline, {
    path: ["applicationDeadline"],
    message: "Applications should close before the delivery deadline",
  });

export type CampaignInput = z.input<typeof campaignSchema>;
export type CampaignValues = z.output<typeof campaignSchema>;

export const CAMPAIGN_TRANSITIONS: Record<string, { to: string; label: string; tone?: "danger" }[]> = {
  draft: [
    { to: "published", label: "Publish" },
    { to: "archived", label: "Archive", tone: "danger" },
  ],
  published: [
    { to: "paused", label: "Pause applications" },
    { to: "closed", label: "Close campaign", tone: "danger" },
  ],
  paused: [
    { to: "published", label: "Resume" },
    { to: "closed", label: "Close campaign", tone: "danger" },
  ],
  closed: [{ to: "archived", label: "Archive" }],
  archived: [],
};
