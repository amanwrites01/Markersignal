"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Loader2, Plus, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { createCreatorGroup } from "@/server/messages";
import { initials } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { SelectableCreator } from "@/lib/data/messages";

interface CreateGroupDialogProps {
  creators: SelectableCreator[];
  campaigns: Array<{ id: string; title: string }>;
  triggerLabel?: string;
  className?: string;
}

export function CreateGroupDialog({
  creators,
  campaigns,
  triggerLabel = "Create Group",
  className,
}: CreateGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "shortlisted">("all");
  const [pending, startTransition] = useTransition();

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      if (filterMode === "shortlisted" && !c.isShortlisted) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.headline && c.headline.toLowerCase().includes(q))
      );
    });
  }, [creators, search, filterMode]);

  const shortlistedCount = useMemo(
    () => creators.filter((c) => c.isShortlisted).length,
    [creators],
  );

  function toggleCreator(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function removeCreator(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function handleReset() {
    setName("");
    setCampaignId("");
    setInitialMessage("");
    setSelectedIds([]);
    setSearch("");
    setFilterMode("all");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Please enter a group name");
    }
    if (selectedIds.length === 0) {
      return toast.error("Please select at least 1 creator for the group");
    }

    startTransition(async () => {
      const res = await createCreatorGroup({
        name: name.trim(),
        creatorIds: selectedIds,
        campaignId: campaignId || null,
        initialMessage: initialMessage.trim() || null,
      });

      if (res.ok) {
        toast.success(`Group "${name.trim()}" created with ${selectedIds.length} creator${selectedIds.length > 1 ? "s" : ""}!`);
        setOpen(false);
        handleReset();
        router.push(`/brand/messages?c=${res.data.conversationId}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create group");
      }
    });
  }

  const selectedCreators = creators.filter((c) => selectedIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 rounded-xl border-line font-medium text-forest shadow-xs hover:border-forest/40 hover:bg-forest/5 dark:text-ivory dark:hover:bg-white/10",
            className,
          )}
        >
          <Users className="size-4 text-emerald-600 dark:text-lime" />
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10 dark:bg-white/10 text-forest dark:text-lime">
              <Users className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Create Creator Group</DialogTitle>
              <DialogDescription className="text-xs text-ink-muted">
                Create a squad group to broadcast campaign briefs and chat with multiple creators at once.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Group Name */}
          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Group Name <span className="text-danger">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="e.g., Summer UGC Campaign Squad, Tech Reviewers Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
          </div>

          {/* Optional Campaign Link */}
          {campaigns.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="group-campaign" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Linked Campaign <span className="text-xs font-normal normal-case text-ink-muted">(Optional)</span>
              </Label>
              <NativeSelect
                id="group-campaign"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">No linked campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {/* Creator Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Select Creators <span className="text-danger">*</span>
              </Label>
              <span className="text-xs font-medium text-ink-muted">
                {selectedIds.length} selected
              </span>
            </div>

            {/* Selected Creator Chips */}
            {selectedCreators.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/40 border border-line">
                {selectedCreators.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-card border border-line shadow-2xs"
                  >
                    <Avatar className="size-4">
                      {c.avatarPath ? <AvatarImage src={publicFileUrl("avatars", c.avatarPath)!} alt="" /> : null}
                      <AvatarFallback className="bg-forest text-[8px] text-lime">
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCreator(c.id)}
                      className="ml-0.5 rounded-full p-0.5 text-ink-muted hover:bg-forest/10 hover:text-forest"
                      aria-label={`Remove ${c.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Search and Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-ink-muted pointer-events-none" />
                <Input
                  placeholder="Search creators by name or skills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              {shortlistedCount > 0 ? (
                <div className="flex rounded-lg border border-line p-0.5 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setFilterMode("all")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                      filterMode === "all" ? "bg-white dark:bg-card shadow-2xs text-forest dark:text-ivory" : "text-ink-muted hover:text-forest",
                    )}
                  >
                    All ({creators.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("shortlisted")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-colors",
                      filterMode === "shortlisted" ? "bg-white dark:bg-card shadow-2xs text-forest dark:text-ivory" : "text-ink-muted hover:text-forest",
                    )}
                  >
                    <Bookmark className="size-3 text-amber-500" />
                    <span>Saved ({shortlistedCount})</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Creator Picker List */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-line divide-y divide-line/60 bg-white dark:bg-card">
              {filteredCreators.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted">
                  No creators found matching your search.
                </div>
              ) : (
                filteredCreators.map((c) => {
                  const isChecked = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors",
                        isChecked && "bg-forest/5 dark:bg-white/5",
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleCreator(c.id)}
                      />
                      <Avatar className="size-8 shrink-0">
                        {c.avatarPath ? <AvatarImage src={publicFileUrl("avatars", c.avatarPath)!} alt="" /> : null}
                        <AvatarFallback className="bg-forest text-xs text-lime">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-forest dark:text-ivory">
                            {c.name}
                          </span>
                          {c.isShortlisted ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400">
                              Shortlisted
                            </Badge>
                          ) : null}
                        </div>
                        {c.headline ? (
                          <p className="truncate text-[11px] text-ink-muted">{c.headline}</p>
                        ) : null}
                      </div>
                      {isChecked ? (
                        <Check className="size-4 text-emerald-600 dark:text-lime shrink-0" />
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Initial Welcome Message */}
          <div className="space-y-1.5">
            <Label htmlFor="initial-msg" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              First Group Message <span className="text-xs font-normal normal-case text-ink-muted">(Sent to all members)</span>
            </Label>
            <Textarea
              id="initial-msg"
              placeholder="e.g., Welcome everyone! We are launching our summer campaign and look forward to collaborating together..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              rows={3}
              maxLength={5000}
            />
            <p className="text-[11px] text-ink-muted">
              All creators in this group will receive this message and can reply directly in the thread.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !name.trim() || selectedIds.length === 0}
              className="gap-2"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              <span>Create Group ({selectedIds.length})</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
