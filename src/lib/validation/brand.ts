import { z } from "zod";
import { optionalText, optionalUrl, slugSchema } from "./common";

export const TEAM_SIZES = ["solo", "2-10", "11-50", "51-200", "200+"] as const;
export const LINK_KINDS = ["website", "instagram", "tiktok", "youtube", "linkedin", "x", "behance", "dribbble", "vimeo", "other"] as const;

export const brandBasicsSchema = z.object({
  brandName: z.string().trim().min(1, "Enter your brand name").max(100),
  slug: slugSchema,
  industryId: z.coerce.number().int().positive().nullable().optional(),
  description: optionalText(3000),
  website: optionalUrl,
  locationCountry: optionalText(80),
  logoPath: z.string().max(300).nullable().optional(),
});

export const profileLinksSchema = z.object({
  links: z
    .array(
      z.object({
        kind: z.enum(LINK_KINDS),
        url: z
          .string()
          .trim()
          .max(500)
          .regex(/^https?:\/\/[^\s]+\.[^\s]+/i, "Enter a full URL starting with https://"),
      }),
    )
    .max(10),
});

export const brandContactSchema = z.object({
  contactName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  contactPhone: optionalText(40),
  teamSize: z.enum(TEAM_SIZES).nullable().optional(),
});

export type BrandBasicsInput = z.input<typeof brandBasicsSchema>;
export type BrandContactInput = z.input<typeof brandContactSchema>;
export type ProfileLinksInput = z.input<typeof profileLinksSchema>;
