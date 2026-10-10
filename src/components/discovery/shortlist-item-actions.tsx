"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toggleShortlist } from "@/server/brand";
import { updateShortlistNote } from "@/server/shortlist";

export function ShortlistNote({ creatorId, note }: { creatorId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  if (!editing) {
    return (
      <div className="text-sm">
        {note ? <p className="whitespace-pre-line text-forest/85">{note}</p> : <p className="text-ink-muted">No notes yet.</p>}
        <button type="button" onClick={() => setEditing(true)} className="mt-1 text-xs font-medium underline underline-offset-4">
          {note ? "Edit note" : "Add a note"}
        </button>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <label htmlFor={`note-${creatorId}`} className="sr-only">
        Private note
      </label>
      <Textarea id={`note-${creatorId}`} rows={3} maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Why they're a fit, rates discussed, availability…" />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await updateShortlistNote({ creatorId, note: value });
              if (r.ok) {
                toast.success(r.message);
                setEditing(false);
              } else toast.error(r.error);
            })
          }
        >
          Save note
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function RemoveFromShortlist({ creatorId }: { creatorId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-danger hover:text-danger"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleShortlist(creatorId, false);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      Remove
    </Button>
  );
}
