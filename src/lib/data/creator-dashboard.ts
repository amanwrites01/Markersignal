import "server-only";
import { createClient } from "@/lib/supabase/server";
import { creatorCompleteness } from "@/lib/profile-completeness";

export async function getCreatorCompleteness(userId: string) {
  const supabase = await createClient();
  const [{ data: p }, cats, skills, styles, platforms, portfolio, services] = await Promise.all([
    supabase.from("creator_profiles").select("*").eq("id", userId).single(),
    supabase.from("creator_category_links").select("category_id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("creator_skills").select("skill_id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("creator_style_tags").select("style_tag_id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("creator_platforms").select("platform_id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("creator_id", userId),
    supabase.from("creator_services").select("id", { count: "exact", head: true }).eq("creator_id", userId).eq("active", true),
  ]);
  return {
    profile: p!,
    ...creatorCompleteness({
      displayName: p?.display_name,
      headline: p?.headline,
      bio: p?.bio,
      avatarPath: p?.avatar_path,
      location: p?.location_city || p?.location_country,
      categoryCount: cats.count ?? 0,
      skillCount: skills.count ?? 0,
      styleCount: styles.count ?? 0,
      platformCount: platforms.count ?? 0,
      portfolioCount: portfolio.count ?? 0,
      serviceCount: services.count ?? 0,
      startingRateCents: p?.starting_rate_cents,
    }),
  };
}
