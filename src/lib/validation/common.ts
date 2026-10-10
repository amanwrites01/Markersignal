import { z } from "zod";

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Enter a full URL starting with https://")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const idList = z.array(z.coerce.number().int().positive()).max(30);

export const moneyInput = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Enter a positive amount" });
      return z.NEVER;
    }
    if (n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "That amount looks too large" });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });

export const optionalDate = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date")
  .transform((v) => (v ? v : null));

export const currencySchema = z.enum(["USD", "EUR", "GBP", "INR", "AUD", "CAD"]).default("USD");
export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD"] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Storage path must live in the caller's own folder. */
export function ownsStoragePath(path: string | null | undefined, userId: string): boolean {
  if (!path) return true;
  return path.startsWith(`${userId}/`) && !path.includes("..");
}
