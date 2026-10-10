"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/browser";
import { safeFileName, validateUpload } from "@/lib/storage";

/** Uploads one file to a storage bucket under the given folder and returns its path + metadata. */
export function MediaUpload({
  bucket,
  folder,
  onUploaded,
  accept,
  label = "Upload file",
}: {
  bucket: "portfolio" | "deliverables";
  folder: string;
  onUploaded: (file: { path: string; name: string; type: string; size: number }) => void;
  accept?: string;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string | null>(null);

  async function upload(file: File) {
    const problem = validateUpload(bucket, file);
    if (problem) return toast.error(problem);
    setBusy(true);
    const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await getBrowserClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return toast.error("Upload failed. Check your connection and try again.");
    setName(file.name);
    onUploaded({ path, name: file.name, type: file.type, size: file.size });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
        {busy ? "Uploading…" : label}
      </Button>
      {name ? <span className="max-w-[220px] truncate text-sm text-ink-muted">{name}</span> : null}
    </div>
  );
}
