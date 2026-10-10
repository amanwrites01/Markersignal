import { publicEnv } from "@/lib/env";

export type PublicBucket = "avatars" | "brand-logos" | "portfolio";

/** Public URL for files in public buckets (avatars, logos, portfolio). */
export function publicFileUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export const UPLOAD_LIMITS = {
  avatars: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  "brand-logos": { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] },
  portfolio: {
    maxBytes: 25 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"],
  },
  deliverables: {
    maxBytes: 50 * 1024 * 1024,
    types: [
      "image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime",
      "application/pdf", "application/zip", "audio/mpeg", "audio/wav", "text/plain",
    ],
  },
} as const;

export function validateUpload(bucket: keyof typeof UPLOAD_LIMITS, file: { size: number; type: string }): string | null {
  const limits = UPLOAD_LIMITS[bucket];
  if (!(limits.types as readonly string[]).includes(file.type)) return "This file type isn't supported here.";
  if (file.size > limits.maxBytes) return `Files must be under ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`;
  return null;
}

/** Storage-safe file name: keeps the extension, strips everything unusual. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${base}.${ext}` : base;
}
