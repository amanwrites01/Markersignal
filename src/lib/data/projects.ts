import "server-only";
import { createClient } from "@/lib/supabase/server";

export const PROJECT_TABS = [
  { key: "active", label: "Active", statuses: ["active", "in_review", "revision_requested", "disputed"] },
  { key: "agreement", label: "Awaiting agreement", statuses: ["awaiting_agreement"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
] as const;

export async function getProjectList(userId: string, role: "creator" | "brand", tabKey?: string) {
  const supabase = await createClient();
  const tab = PROJECT_TABS.find((t) => t.key === tabKey) ?? PROJECT_TABS[0];
  const { data } = await supabase
    .from("projects")
    .select("id, title, status, due_date, agreed_amount_cents, currency, updated_at, brand_profiles(brand_name), creator_profiles(display_name), deliverables(status, due_date)")
    .eq(role === "brand" ? "brand_id" : "creator_id", userId)
    .in("status", [...tab.statuses])
    .order("updated_at", { ascending: false });
  const counts = await Promise.all(
    PROJECT_TABS.map(async (t) => {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq(role === "brand" ? "brand_id" : "creator_id", userId)
        .in("status", [...t.statuses]);
      return [t.key, count ?? 0] as const;
    }),
  );
  return { tab, projects: data ?? [], counts: Object.fromEntries(counts) as Record<string, number> };
}

/** Everything the workspace needs. Returns null when the caller isn't a member (RLS hides the row). */
export async function getProjectWorkspace(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, campaigns(title), brand_profiles(brand_name, slug), creator_profiles(display_name, slug)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const role: "brand" | "creator" = project.brand_id === userId ? "brand" : project.creator_id === userId ? "creator" : (null as never);
  if (!role) return null;

  const [milestones, deliverables, comments, audit, rights, reviews] = await Promise.all([
    supabase.from("project_milestones").select("*").eq("project_id", projectId).order("sort_order").order("created_at"),
    supabase.from("deliverables").select("*, deliverable_types(name), platforms(name)").eq("project_id", projectId).order("created_at"),
    supabase.from("project_comments").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("audit_logs").select("id, action, actor_id, metadata, created_at, entity_type").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
    supabase.from("rights_records_effective").select("id, title, effective_status, revision").eq("project_id", projectId).order("created_at"),
    supabase.from("reviews").select("id, direction, rating, body, created_at, reviewer_id").eq("project_id", projectId),
  ]);

  const deliverableIds = (deliverables.data ?? []).map((d) => d.id);
  const [versions, feedback] = deliverableIds.length
    ? await Promise.all([
        supabase.from("deliverable_versions").select("*").in("deliverable_id", deliverableIds).order("version_number", { ascending: false }),
        supabase.from("deliverable_feedback").select("*").in("deliverable_id", deliverableIds).order("created_at"),
      ])
    : [{ data: [] as never[] }, { data: [] as never[] }];

  // Short-lived signed URLs; storage policies only allow project members.
  const paths = (versions.data ?? []).map((v) => v.storage_path).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("deliverables").createSignedUrls(paths, 60 * 10, { download: true });
    for (const s of data ?? []) if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl);
  }

  const names: Record<string, string> = {
    [project.brand_id]: project.brand_profiles?.brand_name ?? "Brand",
    [project.creator_id]: project.creator_profiles?.display_name ?? "Creator",
  };

  return {
    role,
    project,
    names,
    milestones: milestones.data ?? [],
    deliverables: (deliverables.data ?? []).map((d) => ({
      ...d,
      versions: (versions.data ?? [])
        .filter((v) => v.deliverable_id === d.id)
        .map((v) => ({ ...v, download_url: v.storage_path ? signed.get(v.storage_path) ?? null : null })),
      feedback: (feedback.data ?? []).filter((f) => f.deliverable_id === d.id),
    })),
    comments: comments.data ?? [],
    audit: audit.data ?? [],
    rights: rights.data ?? [],
    reviews: reviews.data ?? [],
  };
}

export type ProjectWorkspaceData = NonNullable<Awaited<ReturnType<typeof getProjectWorkspace>>>;
export type WorkspaceDeliverable = ProjectWorkspaceData["deliverables"][number];
