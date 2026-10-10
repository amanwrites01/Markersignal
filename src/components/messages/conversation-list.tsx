"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { CreateGroupDialog } from "./create-group-dialog";
import { initials, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationSummary, SelectableCreator } from "@/lib/data/messages";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId?: string;
  role: "brand" | "creator";
  selectableCreators?: SelectableCreator[];
  brandCampaigns?: Array<{ id: string; title: string }>;
}

export function ConversationList({
  conversations,
  activeId,
  role,
  selectableCreators = [],
  brandCampaigns = [],
}: ConversationListProps) {
  const base = `/${role}/messages`;
  const [tab, setTab] = useState<"all" | "groups" | "direct">("all");
  const [query, setQuery] = useState("");

  const groupConversations = useMemo(
    () => conversations.filter((c) => c.isGroup),
    [conversations],
  );

  const directConversations = useMemo(
    () => conversations.filter((c) => !c.isGroup),
    [conversations],
  );

  const filtered = useMemo(() => {
    const list =
      tab === "groups"
        ? groupConversations
        : tab === "direct"
          ? directConversations
          : conversations;

    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (c) =>
        c.otherName.toLowerCase().includes(q) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.preview && c.preview.toLowerCase().includes(q)) ||
        (c.memberNames && c.memberNames.some((m) => m.toLowerCase().includes(q))),
    );
  }, [conversations, groupConversations, directConversations, tab, query]);

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Top Section / Header */}
      <div className="p-3.5 border-b border-line space-y-2.5 bg-muted/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Inbox
          </span>
          {role === "brand" ? (
            <CreateGroupDialog
              creators={selectableCreators}
              campaigns={brandCampaigns}
              triggerLabel="New Group"
              className="h-7 text-xs px-2.5"
            />
          ) : null}
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-muted/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1 font-medium transition-colors",
              tab === "all"
                ? "bg-white dark:bg-card text-forest dark:text-ivory shadow-2xs font-semibold"
                : "text-ink-muted hover:text-forest dark:hover:text-ivory",
            )}
          >
            <span>All</span>
            <span className="text-[10px] text-ink-muted">({conversations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("groups")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1 font-medium transition-colors",
              tab === "groups"
                ? "bg-white dark:bg-card text-forest dark:text-ivory shadow-2xs font-semibold"
                : "text-ink-muted hover:text-forest dark:hover:text-ivory",
            )}
          >
            <Users className="size-3 text-emerald-600 dark:text-lime" />
            <span>Groups</span>
            <span className="text-[10px] text-ink-muted">({groupConversations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("direct")}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg py-1 font-medium transition-colors",
              tab === "direct"
                ? "bg-white dark:bg-card text-forest dark:text-ivory shadow-2xs font-semibold"
                : "text-ink-muted hover:text-forest dark:hover:text-ivory",
            )}
          >
            <span>Direct</span>
            <span className="text-[10px] text-ink-muted">({directConversations.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-ink-muted pointer-events-none" />
          <Input
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white dark:bg-card border-line"
          />
        </div>
      </div>

      {/* Conversation List */}
      <nav aria-label="Conversations" className="flex-1 overflow-y-auto min-h-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted space-y-2">
            {tab === "groups" ? (
              <>
                <Users className="size-8 mx-auto text-ink-muted/50 mb-1" />
                <p className="font-medium text-forest dark:text-ivory">No creator groups yet</p>
                {role === "brand" ? (
                  <p className="text-[11px]">
                    Create a group to message and coordinate with multiple creators simultaneously.
                  </p>
                ) : (
                  <p className="text-[11px]">
                    Groups you are invited to by brands will appear here.
                  </p>
                )}
              </>
            ) : query.trim() ? (
              <p>No conversations match &ldquo;{query}&rdquo;</p>
            ) : (
              <p>No conversations in this tab.</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {filtered.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`${base}?c=${c.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left relative",
                      active && "bg-secondary",
                    )}
                  >
                    {/* Avatar */}
                    {c.isGroup ? (
                      <div className="relative size-10 shrink-0 flex items-center justify-center rounded-full bg-forest/10 dark:bg-white/10 text-forest dark:text-lime ring-1 ring-forest/20 dark:ring-lime/30">
                        <Users className="size-5" />
                      </div>
                    ) : (
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-forest text-xs text-lime">
                          {initials(c.otherName)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className={cn("truncate text-sm", c.unread ? "font-bold text-forest dark:text-ivory" : "font-medium")}>
                            {c.otherName}
                          </p>
                          {c.isGroup ? (
                            <span className="shrink-0 rounded-md bg-forest/10 px-1.5 py-0.2 text-[10px] font-semibold text-forest dark:bg-white/10 dark:text-lime">
                              Group ({c.memberCount})
                            </span>
                          ) : null}
                        </div>
                        {c.lastMessageAt ? (
                          <span className="shrink-0 text-[11px] text-ink-muted">
                            {relativeTime(c.lastMessageAt)}
                          </span>
                        ) : null}
                      </div>

                      {c.isGroup && c.memberNames.length > 0 ? (
                        <p className="truncate text-xs text-ink-muted">
                          {c.memberNames.slice(0, 3).join(", ")}
                          {c.memberNames.length > 3 ? ` +${c.memberNames.length - 3}` : ""}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-ink-muted">{c.subject ?? "Direct Conversation"}</p>
                      )}

                      <p className={cn("mt-0.5 truncate text-xs", c.unread ? "font-semibold text-forest dark:text-lime" : "text-ink-muted")}>
                        {c.preview ?? "No messages yet"}
                      </p>
                    </div>

                    {c.unread ? (
                      <span
                        className="mt-2 size-2.5 shrink-0 rounded-full bg-lime ring-2 ring-forest"
                        aria-label="Unread"
                        role="img"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
