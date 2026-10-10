"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { addCreatorsToGroup } from "@/server/messages";
import { initials } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { SelectableCreator, ThreadParty } from "@/lib/data/messages";

interface GroupMembersDialogProps {
  conversationId: string;
  conversationSubject: string | null;
  parties: ThreadParty[];
  role: "brand" | "creator";
  availableCreators?: SelectableCreator[];
}

export function GroupMembersDialog({
  conversationId,
  conversationSubject,
  parties,
  role,
  availableCreators = [],
}: GroupMembersDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const existingIds = useMemo(() => new Set(parties.map((p) => p.id)), [parties]);

  const addableCreators = useMemo(() => {
    return availableCreators.filter((c) => {
      if (existingIds.has(c.id)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.headline && c.headline.toLowerCase().includes(q))
      );
    });
  }, [availableCreators, existingIds, search]);

  function toggleAdd(id: string) {
    setSelectedToAdd((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedToAdd.length === 0) return;

    startTransition(async () => {
      const res = await addCreatorsToGroup({
        conversationId,
        creatorIds: selectedToAdd,
      });

      if (res.ok) {
        toast.success(`Added ${selectedToAdd.length} creator${selectedToAdd.length > 1 ? "s" : ""} to the group!`);
        setSelectedToAdd([]);
        setAddingOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to add creators");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-ink-muted hover:text-forest dark:hover:text-ivory"
        >
          <Users className="size-3.5" />
          <span>{parties.length + 1} members</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-5 pb-3 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-forest/10 dark:bg-white/10 text-forest dark:text-lime">
                <Users className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Group Members</DialogTitle>
                <DialogDescription className="text-xs text-ink-muted truncate max-w-[280px]">
                  {conversationSubject?.replace(/^group:\s*/i, "") || "Creator Group"}
                </DialogDescription>
              </div>
            </div>

            {role === "brand" && availableCreators.length > 0 && !addingOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingOpen(true)}
                className="h-8 gap-1 text-xs"
              >
                <UserPlus className="size-3.5" />
                <span>Add</span>
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {addingOpen ? (
          /* Add Creators Form */
          <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Add Creators to Group
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddingOpen(false);
                  setSelectedToAdd([]);
                }}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-ink-muted pointer-events-none" />
              <Input
                placeholder="Search creators to add…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line/60 bg-white dark:bg-card">
              {addableCreators.length === 0 ? (
                <div className="p-5 text-center text-xs text-ink-muted">
                  No additional creators found to add.
                </div>
              ) : (
                addableCreators.map((c) => {
                  const isChecked = selectedToAdd.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/40 transition-colors",
                        isChecked && "bg-forest/5 dark:bg-white/5",
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleAdd(c.id)}
                      />
                      <Avatar className="size-7 shrink-0">
                        {c.avatarPath ? <AvatarImage src={publicFileUrl("avatars", c.avatarPath)!} alt="" /> : null}
                        <AvatarFallback className="bg-forest text-[10px] text-lime">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{c.name}</p>
                        {c.headline ? <p className="truncate text-[10px] text-ink-muted">{c.headline}</p> : null}
                      </div>
                      {isChecked ? <Check className="size-3.5 text-emerald-600 dark:text-lime" /> : null}
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={pending || selectedToAdd.length === 0}
                className="gap-1.5"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                <span>Add {selectedToAdd.length > 0 ? `(${selectedToAdd.length})` : ""}</span>
              </Button>
            </div>
          </form>
        ) : (
          /* Members List */
          <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-line/60">
            {/* Host Note */}
            <div className="flex items-center justify-between pb-2 text-xs text-ink-muted">
              <span>{parties.length + 1} total members in this group</span>
              <Badge variant="secondary" className="text-[10px]">Active</Badge>
            </div>

            {/* Current Members */}
            <div className="pt-2 space-y-2">
              {parties.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-8 shrink-0">
                      {p.avatarPath ? <AvatarImage src={publicFileUrl("avatars", p.avatarPath)!} alt="" /> : null}
                      <AvatarFallback className="bg-forest text-xs text-lime">
                        {initials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-forest dark:text-ivory">
                          {p.name}
                        </span>
                        {p.isBrand ? (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-forest/30 text-forest dark:text-lime">
                            Brand
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            Creator
                          </Badge>
                        )}
                      </div>
                      {p.headline ? (
                        <p className="truncate text-[11px] text-ink-muted">{p.headline}</p>
                      ) : null}
                    </div>
                  </div>

                  {p.slug ? (
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link href={`/creators/${p.slug}`}>Profile</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
