"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, type ActionResult } from "@/lib/errors";
import { requireViewer } from "@/lib/auth/session";
import { ownsStoragePath } from "@/lib/validation/common";
import {
  creatorBasicsSchema,
  creatorDnaSchema,
  creatorRatesSchema,
} from "@/lib/validation/creator";
import { brandBasicsSchema, brandContactSchema, profileLinksSchema } from "@/lib/validation/brand";

export async function chooseRole(role: unknown): Promise<ActionResult> {
  const parsed = z.enum(["creator", "brand"]).safeParse(role);
  if (!parsed.success) return fail("Choose creator or brand.");
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_initial_role", { p_role: parsed.data });
  if (error) return fail(dbError(error));
  redirect(parsed.data === "creator" ? "/creator/onboarding" : "/brand/onboarding");
}

// ---------------------------------------------------------------------------
// Creator
// ---------------------------------------------------------------------------

async function requireCreator() {
  const viewer = await requireViewer();
  if (viewer.profile.role !== "creator") throw new Error("Creator role required");
  return viewer;
}

export async function saveCreatorBasics(input: unknown, step = 1): Promise<ActionResult> {
  const viewer = await requireCreator();
  const parsed = creatorBasicsSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  if (!ownsStoragePath(v.avatarPath, viewer.id)) return fail("Invalid image upload.");

  const supabase = await createClient();
  const row = {
    display_name: v.displayName,
    slug: v.slug,
    headline: v.headline ?? null,
    bio: v.bio ?? null,
    location_city: v.locationCity ?? null,
    location_country: v.locationCountry ?? null,
    languages: v.languages,
    avatar_path: v.avatarPath ?? null,
  };
  const { data: existing } = await supabase.from("creator_profiles").select("id, onboarding_step").eq("id", viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("creator_profiles").update({ ...row, onboarding_step: Math.max(existing.onboarding_step, step) }).eq("id", viewer.id)
    : await supabase.from("creator_profiles").insert({ id: viewer.id, ...row, onboarding_step: step });
  if (error) {
    if (error.code === "23505") return fail("That profile URL is taken.", { slug: ["That profile URL is taken — try another"] });
    return fail(dbError(error));
  }
  await supabase.from("profiles").update({ full_name: v.displayName, avatar_path: v.avatarPath ?? null }).eq("id", viewer.id);
  revalidatePath("/creator", "layout");
  return ok(undefined, "Saved");
}

/** Replace a creator's links in a join table with the given ids. */
async function replaceLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "creator_category_links" | "creator_skills" | "creator_style_tags" | "creator_platforms",
  column: "category_id" | "skill_id" | "style_tag_id" | "platform_id",
  creatorId: string,
  ids: number[],
) {
  const del = await supabase.from(table).delete().eq("creator_id", creatorId);
  if (del.error) return del.error;
  if (ids.length === 0) return null;
  const rows = [...new Set(ids)].map((id) => ({ creator_id: creatorId, [column]: id }));
  const ins = await supabase.from(table).insert(rows as never);
  return ins.error;
}

export async function saveCreatorDna(input: unknown, step = 2): Promise<ActionResult> {
  const viewer = await requireCreator();
  const parsed = creatorDnaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("creator_profiles").select("onboarding_step").eq("id", viewer.id).maybeSingle();
  if (!profile) return fail("Save your basics first.");

  for (const [table, column, ids] of [
    ["creator_category_links", "category_id", parsed.data.categoryIds],
    ["creator_skills", "skill_id", parsed.data.skillIds],
    ["creator_style_tags", "style_tag_id", parsed.data.styleIds],
    ["creator_platforms", "platform_id", parsed.data.platformIds],
  ] as const) {
    const error = await replaceLinks(supabase, table, column, viewer.id, ids);
    if (error) return fail(dbError(error));
  }
  await supabase.from("creator_profiles").update({ onboarding_step: Math.max(profile.onboarding_step, step) }).eq("id", viewer.id);
  revalidatePath("/creator", "layout");
  return ok(undefined, "Saved");
}

export async function saveCreatorRates(input: unknown, step = 3): Promise<ActionResult> {
  const viewer = await requireCreator();
  const parsed = creatorRatesSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("creator_profiles").select("onboarding_step").eq("id", viewer.id).maybeSingle();
  if (!profile) return fail("Save your basics first.");
  const { error } = await supabase
    .from("creator_profiles")
    .update({
      starting_rate_cents: v.startingRate,
      currency: v.currency,
      availability: v.availability,
      available_from: v.availableFrom,
      collaboration_types: v.collaborationTypes,
      visibility: v.visibility,
      onboarding_step: Math.max(profile.onboarding_step, step),
    })
    .eq("id", viewer.id);
  if (error) return fail(dbError(error));
  revalidatePath("/creator", "layout");
  return ok(undefined, "Saved");
}

export async function finishOnboarding(): Promise<ActionResult> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding");
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  redirect(viewer.profile.role === "brand" ? "/brand/dashboard?welcome=1" : "/creator/dashboard?welcome=1");
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

async function requireBrand() {
  const viewer = await requireViewer();
  if (viewer.profile.role !== "brand") throw new Error("Brand role required");
  return viewer;
}

export async function saveBrandBasics(input: unknown, step = 1): Promise<ActionResult> {
  const viewer = await requireBrand();
  const parsed = brandBasicsSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  if (!ownsStoragePath(v.logoPath, viewer.id)) return fail("Invalid logo upload.");
  const supabase = await createClient();
  const row = {
    brand_name: v.brandName,
    slug: v.slug,
    industry_id: v.industryId ?? null,
    description: v.description ?? null,
    website: v.website ?? null,
    location_country: v.locationCountry ?? null,
    logo_path: v.logoPath ?? null,
  };
  const { data: existing } = await supabase.from("brand_profiles").select("id, onboarding_step").eq("id", viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("brand_profiles").update({ ...row, onboarding_step: Math.max(existing.onboarding_step, step) }).eq("id", viewer.id)
    : await supabase.from("brand_profiles").insert({ id: viewer.id, ...row, onboarding_step: step });
  if (error) {
    if (error.code === "23505") return fail("That brand URL is taken.", { slug: ["That URL is taken — try another"] });
    return fail(dbError(error));
  }
  revalidatePath("/brand", "layout");
  return ok(undefined, "Saved");
}

export async function saveProfileLinks(input: unknown, brandStep?: number): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = profileLinksSchema.safeParse(input);
  if (!parsed.success) return fail("Check the links.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const del = await supabase.from("profile_links").delete().eq("profile_id", viewer.id);
  if (del.error) return fail(dbError(del.error));
  const unique = new Map(parsed.data.links.map((l) => [`${l.kind}|${l.url}`, l]));
  if (unique.size) {
    const { error } = await supabase
      .from("profile_links")
      .insert([...unique.values()].map((l) => ({ profile_id: viewer.id, kind: l.kind, url: l.url })));
    if (error) return fail(dbError(error));
  }
  if (brandStep && viewer.profile.role === "brand") {
    const { data: brand } = await supabase.from("brand_profiles").select("onboarding_step").eq("id", viewer.id).maybeSingle();
    if (brand) await supabase.from("brand_profiles").update({ onboarding_step: Math.max(brand.onboarding_step, brandStep) }).eq("id", viewer.id);
  }
  revalidatePath("/", "layout");
  return ok(undefined, "Links saved");
}

export async function saveBrandContact(input: unknown, step = 3): Promise<ActionResult> {
  const viewer = await requireBrand();
  const parsed = brandContactSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: brand } = await supabase.from("brand_profiles").select("onboarding_step").eq("id", viewer.id).maybeSingle();
  if (!brand) return fail("Save your brand basics first.");
  const { error } = await supabase.from("brand_contacts").upsert({
    brand_id: viewer.id,
    contact_name: v.contactName ?? null,
    contact_email: v.contactEmail ?? null,
    contact_phone: v.contactPhone ?? null,
  });
  if (error) return fail(dbError(error));
  await supabase
    .from("brand_profiles")
    .update({ team_size: v.teamSize ?? null, onboarding_step: Math.max(brand.onboarding_step, step) })
    .eq("id", viewer.id);
  revalidatePath("/brand", "layout");
  return ok(undefined, "Saved");
}
