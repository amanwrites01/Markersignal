"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/browser";
import { publicFileUrl, safeFileName, validateUpload, type PublicBucket } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Uploads straight to Supabase Storage under `${userId}/…` (RLS only allows
 * a user's own folder) and reports the storage path. The server re-checks the
 * path prefix before saving it.
 */
export function ImageUpload({
  bucket,
  userId,
  value,
  onChange,
  label,
  shape = "square",
  accept = "image/jpeg,image/png,image/webp",
}: {
  bucket: PublicBucket;
  userId: string;
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  label: string;
  shape?: "square" | "circle";
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = publicFileUrl(bucket, value);

  async function handleFile(file: File) {
    const problem = validateUpload(bucket, file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await getBrowserClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) {
      toast.error("Upload failed. Please try again.");
      return;
    }
    onChange(path);
  }

  return (
    <div className="flex items-center gap-4">
      <div className={cn("relative grid size-20 shrink-0 place-items-center overflow-hidden border border-line bg-secondary", shape === "circle" ? "rounded-full" : "rounded-2xl")}>
        {url ? <Image src={url} alt="" fill sizes="80px" className="object-cover" /> : <ImageUp className="size-6 text-gray-brand" aria-hidden />}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-5 animate-spin" aria-label="Uploading" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {value ? "Replace" : label}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X aria-hidden /> Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
