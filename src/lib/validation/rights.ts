import { z } from "zod";
import { idList, optionalDate, optionalText } from "./common";

export const EXCLUSIVITY = ["none", "category", "full"] as const;

export const rightsSchema = z
  .object({
    title: z.string().trim().min(1, "Give this record a title").max(160),
    deliverableId: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
    contentType: optionalText(160),
    platformIds: idList,
    organicUse: z.boolean(),
    paidAdsUse: z.boolean(),
    paidAdsNotes: optionalText(1000),
    territory: z.string().trim().min(1, "Enter a territory, e.g. Worldwide").max(200),
    licenseStart: optionalDate,
    licenseEnd: optionalDate,
    durationMonths: z.coerce.number().int().min(1).max(240).nullable().optional(),
    exclusivity: z.enum(EXCLUSIVITY),
    exclusivityDetails: optionalText(1000),
    rawFilesIncluded: z.boolean(),
    rawFilesNotes: optionalText(1000),
    derivativeEditsAllowed: z.boolean(),
    derivativeNotes: optionalText(1000),
    // Separate, explicit opt-in. Defaults to false and is never inferred.
    aiTrainingAllowed: z.boolean(),
    attributionRequired: z.boolean(),
    attributionDetails: optionalText(500),
    additionalTerms: optionalText(4000),
  })
  .refine((v) => !v.licenseStart || !v.licenseEnd || v.licenseStart <= v.licenseEnd, { path: ["licenseEnd"], message: "End date must be after the start date" })
  .refine((v) => v.exclusivity === "none" || (v.exclusivityDetails && v.exclusivityDetails.length > 0), {
    path: ["exclusivityDetails"],
    message: "Describe what the exclusivity covers",
  });

export type RightsInput = z.input<typeof rightsSchema>;
export type RightsValues = z.output<typeof rightsSchema>;

export const RIGHTS_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  awaiting_creator: "Awaiting creator approval",
  awaiting_brand: "Awaiting brand approval",
  agreed: "Agreed",
  expired: "Expired",
  disputed: "Disputed",
};
