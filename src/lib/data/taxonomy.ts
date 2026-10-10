import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Option = { id: number; name: string; slug: string; description?: string | null; categoryId?: number | null; effortUnits?: number };

export type Taxonomy = {
  categories: Option[];
  styles: Option[];
  skills: Option[];
  platforms: Option[];
  deliverableTypes: Option[];
  industries: Option[];
};

/** Reference data (active rows only). Admins add rows; nothing is hard-coded. */
export const getTaxonomy = cache(async (): Promise<Taxonomy> => {
  const supabase = await createClient();
  const [categories, styles, skills, platforms, deliverableTypes, industries] = await Promise.all([
    supabase.from("creator_categories").select("id, slug, name").eq("active", true).order("sort_order"),
    supabase.from("creative_style_tags").select("id, slug, name, description").eq("active", true).order("sort_order"),
    supabase.from("skills").select("id, slug, name, category_id").eq("active", true).order("name"),
    supabase.from("platforms").select("id, slug, name").eq("active", true).order("sort_order"),
    supabase.from("deliverable_types").select("id, slug, name, effort_units").eq("active", true).order("sort_order"),
    supabase.from("industries").select("id, slug, name").eq("active", true).order("sort_order"),
  ]);
  return {
    categories: categories.data ?? [],
    styles: styles.data ?? [],
    skills: (skills.data ?? []).map((s) => ({ id: s.id, slug: s.slug, name: s.name, categoryId: s.category_id })),
    platforms: platforms.data ?? [],
    deliverableTypes: (deliverableTypes.data ?? []).map((d) => ({ id: d.id, slug: d.slug, name: d.name, effortUnits: Number(d.effort_units) })),
    industries: industries.data ?? [],
  };
});
