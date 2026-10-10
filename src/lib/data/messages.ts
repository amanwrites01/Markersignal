import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ConversationSummary = {
  id: string;
  subject: string | null;
  lastMessageAt: string | null;
  projectId: string | null;
  campaignId: string | null;
  otherName: string;
  otherId: string | null;
  unread: boolean;
  preview: string | null;
  isGroup: boolean;
  memberCount: number;
  memberNames: string[];
};

export type ThreadParty = {
  id: string;
  name: string;
  slug?: string | null;
  headline?: string | null;
  avatarPath?: string | null;
  isBrand?: boolean;
};

export type ThreadMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

/** Names and profile info for parties the viewer can see. */
async function partyProfiles(ids: string[]): Promise<Map<string, ThreadParty>> {
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const [creators, brands, profiles] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("id, display_name, slug, headline, avatar_path")
      .in("id", ids),
    supabase
      .from("brand_profiles")
      .select("id, brand_name, slug, logo_path")
      .in("id", ids),
    supabase.from("profiles").select("id, full_name").in("id", ids),
  ]);

  const m = new Map<string, ThreadParty>();
  for (const p of profiles.data ?? []) {
    if (p.full_name) {
      m.set(p.id, { id: p.id, name: p.full_name, isBrand: false });
    }
  }
  for (const c of creators.data ?? []) {
    m.set(c.id, {
      id: c.id,
      name: c.display_name,
      slug: c.slug,
      headline: c.headline,
      avatarPath: c.avatar_path,
      isBrand: false,
    });
  }
  for (const b of brands.data ?? []) {
    m.set(b.id, {
      id: b.id,
      name: b.brand_name,
      slug: b.slug,
      avatarPath: b.logo_path,
      isBrand: true,
    });
  }
  return m;
}

/** Conversations the viewer belongs to (RLS-enforced), newest activity first. */
export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, conversations!inner(id, subject, last_message_at, project_id, campaign_id, created_at)")
    .eq("profile_id", userId);
  if (!mine?.length) return [];
  const ids = mine.map((m) => m.conversation_id);
  const [{ data: members }, { data: latest }] = await Promise.all([
    supabase.from("conversation_members").select("conversation_id, profile_id").in("conversation_id", ids).neq("profile_id", userId),
    supabase.from("messages").select("conversation_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(200),
  ]);

  const memberIds = [...new Set((members ?? []).map((m) => m.profile_id))];
  const profilesMap = await partyProfiles(memberIds);
  const previews = new Map<string, string>();
  for (const msg of latest ?? []) {
    if (!previews.has(msg.conversation_id)) previews.set(msg.conversation_id, msg.body);
  }

  return mine
    .map((m) => {
      const c = m.conversations!;
      const otherMembers = (members ?? []).filter((x) => x.conversation_id === c.id);
      const isGroup = otherMembers.length > 1 || (c.subject?.toLowerCase().startsWith("group:") ?? false);
      const memberNames = otherMembers
        .map((x) => profilesMap.get(x.profile_id)?.name)
        .filter(Boolean) as string[];
      const firstOther = otherMembers[0];
      const fallbackName = firstOther ? profilesMap.get(firstOther.profile_id)?.name ?? "Conversation" : "Conversation";

      const otherName = isGroup
        ? c.subject
          ? c.subject.replace(/^group:\s*/i, "")
          : memberNames.length > 0
            ? memberNames.slice(0, 3).join(", ")
            : "Creator Group"
        : fallbackName;

      const last = c.last_message_at;
      return {
        id: c.id,
        subject: c.subject,
        lastMessageAt: last ?? c.created_at,
        projectId: c.project_id,
        campaignId: c.campaign_id,
        otherId: firstOther?.profile_id ?? null,
        otherName,
        unread: Boolean(last && (!m.last_read_at || Date.parse(last) > Date.parse(m.last_read_at))),
        preview: previews.get(c.id) ?? null,
        isGroup,
        memberCount: otherMembers.length + 1,
        memberNames,
      };
    })
    .sort((a, b) => Date.parse(b.lastMessageAt ?? "0") - Date.parse(a.lastMessageAt ?? "0"));
}

export async function getThread(conversationId: string, userId: string) {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, subject, project_id, campaign_id, proposal_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null; // not a member (RLS) or doesn't exist

  const [{ data: messages }, { data: members }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("conversation_members")
      .select("profile_id, last_read_at")
      .eq("conversation_id", conversationId),
  ]);

  const allMemberIds = [...new Set((members ?? []).map((m) => m.profile_id))];
  const profilesMap = await partyProfiles(allMemberIds);
  const others = (members ?? []).filter((m) => m.profile_id !== userId);

  const parties: ThreadParty[] = others.map((o) => {
    const p = profilesMap.get(o.profile_id);
    return {
      id: o.profile_id,
      name: p?.name ?? "Member",
      slug: p?.slug ?? null,
      headline: p?.headline ?? null,
      avatarPath: p?.avatarPath ?? null,
      isBrand: p?.isBrand ?? false,
    };
  });

  const otherLastRead = others.map((o) => o.last_read_at).filter(Boolean).sort().at(-1) ?? null;
  const isGroup = others.length > 1 || (conversation.subject?.toLowerCase().startsWith("group:") ?? false);

  return {
    conversation,
    parties,
    otherLastRead,
    isGroup,
    messages: (messages ?? []).map((m) => {
      const p = profilesMap.get(m.sender_id);
      return {
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_id === userId ? "You" : (p?.name ?? "Member"),
        body: m.body,
        createdAt: m.created_at,
      };
    }) as ThreadMessage[],
  };
}

export type SelectableCreator = {
  id: string;
  name: string;
  slug: string;
  headline: string | null;
  avatarPath: string | null;
  isShortlisted?: boolean;
};

/** Creators available for a brand to add to groups (shortlisted + platform creators). */
export async function getSelectableCreatorsForBrand(brandId: string): Promise<SelectableCreator[]> {
  const supabase = await createClient();
  const [{ data: saved }, { data: allPublic }] = await Promise.all([
    supabase
      .from("saved_creators")
      .select("creator_id, creator_profiles(id, display_name, slug, headline, avatar_path)")
      .eq("brand_id", brandId),
    supabase
      .from("creator_profiles")
      .select("id, display_name, slug, headline, avatar_path")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const savedSet = new Set((saved ?? []).map((s) => s.creator_id));
  const map = new Map<string, SelectableCreator>();

  // Add saved creators first (flagged as shortlisted)
  for (const s of saved ?? []) {
    const cp = s.creator_profiles;
    if (cp) {
      map.set(cp.id, {
        id: cp.id,
        name: cp.display_name,
        slug: cp.slug,
        headline: cp.headline,
        avatarPath: cp.avatar_path,
        isShortlisted: true,
      });
    }
  }

  // Add public creators
  for (const cp of allPublic ?? []) {
    if (!map.has(cp.id)) {
      map.set(cp.id, {
        id: cp.id,
        name: cp.display_name,
        slug: cp.slug,
        headline: cp.headline,
        avatarPath: cp.avatar_path,
        isShortlisted: savedSet.has(cp.id),
      });
    }
  }

  return Array.from(map.values());
}

/** Brand's campaigns for tagging groups. */
export async function getBrandCampaignsList(brandId: string): Promise<Array<{ id: string; title: string }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({ id: c.id, title: c.title }));
}
