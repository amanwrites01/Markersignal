import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getOwnBrandProfile(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: contact }, { data: links }] = await Promise.all([
    supabase.from("brand_profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("brand_contacts").select("*").eq("brand_id", userId).maybeSingle(),
    supabase.from("profile_links").select("kind, url").eq("profile_id", userId).order("created_at"),
  ]);
  return { profile, contact, links: links ?? [] };
}
