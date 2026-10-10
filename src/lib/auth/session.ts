import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Role = "creator" | "brand" | "admin";

export type Viewer = {
  id: string;
  email: string | null;
  profile: Tables<"profiles">;
};

/**
 * The signed-in user and their profile. Cached per request.
 * getClaims() verifies the access token's signature locally (asymmetric
 * signing keys), avoiding a round trip to the auth server on every page.
 * The database re-validates the same token on every query (RLS).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).single();
  if (!profile) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile,
  };
});

export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login");
  return viewer;
}

/** Ensures the viewer has the given role; otherwise sends them where they belong. */
export async function requireRole(role: "creator" | "brand"): Promise<Viewer> {
  const viewer = await requireViewer();
  const actual = viewer.profile.role;
  if (actual !== role) {
    if (!actual) redirect("/onboarding");
    redirect(homeFor(actual as Role));
  }
  return viewer;
}

export function homeFor(role: Role | null | undefined): string {
  if (role === "creator") return "/creator/dashboard";
  if (role === "brand") return "/brand/dashboard";
  if (role === "admin") return "/settings";
  return "/onboarding";
}
