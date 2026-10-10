import "server-only";
import { createClient } from "@/lib/supabase/server";

/** A creator's own profile with Creative DNA link ids (for editing). */
export async function getOwnCreatorProfile(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, cats, skills, styles, platforms, links] = await Promise.all([
    supabase.from("creator_profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("creator_category_links").select("category_id").eq("creator_id", userId),
    supabase.from("creator_skills").select("skill_id").eq("creator_id", userId),
    supabase.from("creator_style_tags").select("style_tag_id").eq("creator_id", userId),
    supabase.from("creator_platforms").select("platform_id").eq("creator_id", userId),
    supabase.from("profile_links").select("kind, url").eq("profile_id", userId).order("created_at"),
  ]);
  return {
    profile,
    categoryIds: (cats.data ?? []).map((r) => r.category_id),
    skillIds: (skills.data ?? []).map((r) => r.skill_id),
    styleIds: (styles.data ?? []).map((r) => r.style_tag_id),
    platformIds: (platforms.data ?? []).map((r) => r.platform_id),
    links: links.data ?? [],
  };
}

export type OwnCreatorProfile = Awaited<ReturnType<typeof getOwnCreatorProfile>>;

/** Card data for a set of creators (respects visibility via RLS), in the given order. */
export async function getCreatorCards(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const [profiles, cats, styles, skills, previews] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("id, slug, display_name, headline, avatar_path, location_city, location_country, availability, starting_rate_cents, currency")
      .in("id", ids),
    supabase.from("creator_category_links").select("creator_id, creator_categories(name)").in("creator_id", ids),
    supabase.from("creator_style_tags").select("creator_id, creative_style_tags(name, sort_order)").in("creator_id", ids),
    supabase.from("creator_skills").select("creator_id, skills(name)").in("creator_id", ids),
    supabase.from("portfolio_items").select("creator_id, media_path, sort_order").eq("media_type", "image").not("media_path", "is", null).in("creator_id", ids).order("sort_order"),
  ]);
  const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  return ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      ...byId.get(id)!,
      categories: (cats.data ?? []).filter((r) => r.creator_id === id).map((r) => r.creator_categories?.name ?? "").filter(Boolean),
      styles: (styles.data ?? [])
        .filter((r) => r.creator_id === id)
        .sort((a, b) => (a.creative_style_tags?.sort_order ?? 0) - (b.creative_style_tags?.sort_order ?? 0))
        .map((r) => r.creative_style_tags?.name ?? "")
        .filter(Boolean),
      skills: (skills.data ?? []).filter((r) => r.creator_id === id).map((r) => r.skills?.name ?? "").filter(Boolean),
      preview_paths: (previews.data ?? []).filter((r) => r.creator_id === id).slice(0, 3).map((r) => r.media_path!),
    }));
}
