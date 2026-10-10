import { z } from "zod";
import { currencySchema, idList, moneyInput, optionalDate, optionalText, optionalUrl, slugSchema } from "./common";

export const AVAILABILITY = ["available", "limited", "unavailable"] as const;
export const VISIBILITY = ["public", "members", "hidden"] as const;
export const COLLABORATION = ["remote", "on_site", "hybrid"] as const;

export const creatorBasicsSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(80),
  slug: slugSchema,
  headline: optionalText(140),
  bio: optionalText(3000),
  locationCity: optionalText(80),
  locationCountry: optionalText(80),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  avatarPath: z.string().max(300).nullable().optional(),
});

export const creatorDnaSchema = z.object({
  categoryIds: idList.min(1, "Choose at least one category"),
  skillIds: idList.min(1, "Choose at least one skill"),
  styleIds: idList.min(1, "Choose at least one creative style").max(5, "Pick up to 5 styles that really define your work"),
  platformIds: idList.default([]),
});

export const creatorRatesSchema = z.object({
  startingRate: moneyInput,
  currency: currencySchema,
  availability: z.enum(AVAILABILITY),
  availableFrom: optionalDate,
  collaborationTypes: z.array(z.enum(COLLABORATION)).min(1, "Choose at least one"),
  visibility: z.enum(VISIBILITY),
});

export const creatorProfileSchema = creatorBasicsSchema.merge(creatorDnaSchema).merge(creatorRatesSchema);

export const portfolioItemSchema = z
  .object({
    title: z.string().trim().min(1, "Give this piece a title").max(120),
    description: optionalText(2000),
    categoryId: z.coerce.number().int().positive().nullable().optional(),
    deliverableTypeId: z.coerce.number().int().positive().nullable().optional(),
    platformId: z.coerce.number().int().positive().nullable().optional(),
    industryId: z.coerce.number().int().positive().nullable().optional(),
    clientName: optionalText(120),
    mediaType: z.enum(["image", "video", "link"]),
    mediaPath: z.string().max(300).nullable().optional(),
    externalUrl: optionalUrl,
  })
  .refine((v) => v.mediaPath || v.externalUrl, { path: ["externalUrl"], message: "Upload a file or add a link" });

export const serviceSchema = z.object({
  title: z.string().trim().min(1, "Name this service").max(120),
  description: optionalText(1500),
  deliverableTypeId: z.coerce.number().int().positive().nullable().optional(),
  startingPrice: moneyInput,
  currency: currencySchema,
  turnaroundDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
  revisionsIncluded: z.coerce.number().int().min(0).max(20).nullable().optional(),
  active: z.boolean().default(true),
});

export type CreatorBasicsInput = z.input<typeof creatorBasicsSchema>;
export type CreatorDnaInput = z.input<typeof creatorDnaSchema>;
export type CreatorRatesInput = z.input<typeof creatorRatesSchema>;
export type PortfolioItemInput = z.input<typeof portfolioItemSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
