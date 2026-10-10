import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Rights records for a project the caller belongs to (RLS returns nothing otherwise). */
export async function getProjectRights(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status, brand_id, creator_id, campaigns(title), brand_profiles(brand_name), creator_profiles(display_name)")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const role: "brand" | "creator" | null = project.brand_id === userId ? "brand" : project.creator_id === userId ? "creator" : null;
  if (!role) return null;
  const [records, deliverables] = await Promise.all([
    supabase.from("rights_records_effective").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("deliverables").select("id, title").eq("project_id", projectId).order("created_at"),
  ]);
  const ids = (records.data ?? []).map((r) => r.id!).filter(Boolean);
  const { data: platforms } = ids.length
    ? await supabase.from("rights_record_platforms").select("rights_record_id, platform_id, platforms(name)").in("rights_record_id", ids)
    : { data: [] };
  return {
    role,
    project,
    brandName: project.brand_profiles?.brand_name ?? "Brand",
    creatorName: project.creator_profiles?.display_name ?? "Creator",
    deliverables: deliverables.data ?? [],
    records: (records.data ?? []).map((r) => ({
      ...r,
      platformIds: (platforms ?? []).filter((p) => p.rights_record_id === r.id).map((p) => p.platform_id),
      platformNames: (platforms ?? []).filter((p) => p.rights_record_id === r.id).map((p) => p.platforms?.name ?? "").filter(Boolean),
    })),
  };
}

export type ProjectRights = NonNullable<Awaited<ReturnType<typeof getProjectRights>>>;
export type RightsRecordView = ProjectRights["records"][number];
