import Link from "next/link";
import { ArrowLeft, MessagesSquare, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Thread } from "./thread";
import { ConversationList } from "./conversation-list";
import { CreateGroupDialog } from "./create-group-dialog";
import { GroupMembersDialog } from "./group-members-dialog";
import {
  getBrandCampaignsList,
  getSelectableCreatorsForBrand,
  getThread,
  listConversations,
} from "@/lib/data/messages";
import { cn } from "@/lib/utils";

export async function MessagesView({
  viewerId,
  role,
  selectedId,
}: {
  viewerId: string;
  role: "creator" | "brand";
  selectedId?: string;
}) {
  const base = `/${role}/messages`;
  const conversations = await listConversations(viewerId);
  const validId = selectedId && /^[0-9a-f-]{36}$/i.test(selectedId) ? selectedId : undefined;
  const thread = validId ? await getThread(validId, viewerId) : null;
  const selected = thread ? conversations.find((c) => c.id === thread.conversation.id) : undefined;
  const projectHref = thread?.conversation.project_id ? `/${role}/projects/${thread.conversation.project_id}` : null;
  const campaignHref = thread?.conversation.campaign_id
    ? role === "brand"
      ? `/brand/campaigns/${thread.conversation.campaign_id}`
      : `/campaigns/${thread.conversation.campaign_id}`
    : null;

  const [selectableCreators, brandCampaigns] =
    role === "brand"
      ? await Promise.all([
          getSelectableCreatorsForBrand(viewerId),
          getBrandCampaignsList(viewerId),
        ])
      : [[], []];

  return (
    <>
      <PageHeader
        eyebrow={role === "brand" ? "Brand" : "Creator"}
        title="Messages"
        description={
          role === "brand"
            ? "Chat with individual creators or create squad groups to coordinate and broadcast messages."
            : "Conversations about your proposals, projects, and creator groups."
        }
        actions={
          role === "brand" ? (
            <CreateGroupDialog
              creators={selectableCreators}
              campaigns={brandCampaigns}
              triggerLabel="Create Creator Group"
            />
          ) : null
        }
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={role === "brand" ? Users : MessagesSquare}
          title={role === "brand" ? "No conversations or creator groups yet" : "No conversations yet"}
          description={
            role === "creator"
              ? "A conversation opens when you send a proposal (or when a brand reveals you in a blind review), or when a brand invites you to a creator group."
              : "You can wait for proposals, or create a group of creators right now to broadcast briefs and message everyone at once."
          }
          action={
            role === "brand" ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <CreateGroupDialog
                  creators={selectableCreators}
                  campaigns={brandCampaigns}
                  triggerLabel="Create Creator Group"
                />
                <Button asChild variant="outline">
                  <Link href="/brand/creators">Find creators</Link>
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid h-[calc(100dvh-14rem)] min-h-[520px] overflow-hidden rounded-2xl border border-line bg-white dark:bg-card md:grid-cols-[330px_1fr]">
          {/* Left Sidebar */}
          <div className={cn("min-h-0 border-line md:border-r", thread && "hidden md:block")}>
            <ConversationList
              conversations={conversations}
              activeId={thread?.conversation.id}
              role={role}
              selectableCreators={selectableCreators}
              brandCampaigns={brandCampaigns}
            />
          </div>

          {/* Right Main Thread Area */}
          <section className={cn("flex min-h-0 flex-col", !thread && "hidden md:flex")} aria-label="Conversation">
            {thread ? (
              <>
                <header className="flex flex-wrap items-center gap-3 border-b border-line bg-muted/20 px-4 py-3">
                  <Link href={base} className="rounded-full p-1 md:hidden" aria-label="Back to conversations">
                    <ArrowLeft className="size-5" aria-hidden />
                  </Link>

                  {thread.isGroup ? (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest/10 dark:bg-white/10 text-forest dark:text-lime ring-1 ring-forest/20 dark:ring-lime/30">
                      <Users className="size-4.5" />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-forest dark:text-ivory">
                        {thread.isGroup
                          ? thread.conversation.subject?.replace(/^group:\s*/i, "") || "Creator Group"
                          : thread.parties.map((p) => p.name).join(", ") || "Conversation"}
                      </p>
                      {thread.isGroup ? (
                        <span className="shrink-0 rounded-md bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest dark:bg-white/10 dark:text-lime">
                          Group
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      {thread.isGroup ? (
                        <span>{thread.parties.length + 1} members</span>
                      ) : (
                        <span className="truncate">{thread.conversation.subject ?? "Direct Message"}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {thread.isGroup ? (
                      <GroupMembersDialog
                        conversationId={thread.conversation.id}
                        conversationSubject={thread.conversation.subject}
                        parties={thread.parties}
                        role={role}
                        availableCreators={selectableCreators}
                      />
                    ) : null}

                    {projectHref ? (
                      <Link
                        href={projectHref}
                        className="text-xs font-medium text-forest hover:underline underline-offset-4 dark:text-lime"
                      >
                        Project
                      </Link>
                    ) : null}

                    {campaignHref ? (
                      <Link
                        href={campaignHref}
                        className="text-xs font-medium text-forest hover:underline underline-offset-4 dark:text-lime"
                      >
                        Campaign
                      </Link>
                    ) : null}
                  </div>
                </header>

                <Thread
                  key={thread.conversation.id}
                  conversationId={thread.conversation.id}
                  viewerId={viewerId}
                  messages={thread.messages}
                  otherLastRead={thread.otherLastRead}
                  otherName={selected?.otherName ?? thread.parties[0]?.name ?? "them"}
                  isGroup={thread.isGroup}
                  memberCount={thread.parties.length + 1}
                />
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center text-sm text-ink-muted">
                {validId ? "This conversation isn't available." : "Choose a conversation or create a creator group."}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
