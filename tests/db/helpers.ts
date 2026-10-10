import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const admin = () =>
  createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export const anon = () => createClient<Database>(url(), anonKey(), { auth: { persistSession: false, autoRefreshToken: false } });

const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let n = 0;

/** Creates a confirmed user, signs in, and returns an RLS-bound client. */
export async function newUser(role?: "creator" | "brand") {
  const email = `t${run}${++n}@test.makersignal.test`;
  const password = "Test-pass-2026";
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = anon();
  const s = await client.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  const id = data.user.id;
  if (role) {
    const r = await client.rpc("set_initial_role", { p_role: role });
    if (r.error) throw r.error;
  }
  return { id, email, client };
}

export async function newCreator(visibility: "public" | "members" | "hidden" = "public") {
  const u = await newUser("creator");
  const { error } = await u.client.from("creator_profiles").insert({
    id: u.id,
    slug: `c-${u.id.slice(0, 8)}`,
    display_name: `Creator ${u.id.slice(0, 4)}`,
    visibility,
  });
  if (error) throw error;
  return u;
}

export async function newBrand() {
  const u = await newUser("brand");
  const { error } = await u.client.from("brand_profiles").insert({ id: u.id, slug: `b-${u.id.slice(0, 8)}`, brand_name: `Brand ${u.id.slice(0, 4)}` });
  if (error) throw error;
  return u;
}

export async function refId(table: "deliverable_types" | "platforms", slug: string) {
  const { data } = await anon().from(table).select("id").eq("slug", slug).single();
  return data!.id;
}

/** Brand creates and publishes a valid campaign. */
export async function publishedCampaign(brand: { id: string; client: Client }, opts: { blind?: boolean; visibility?: "public" | "members" | "invite_only" } = {}) {
  const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await brand.client
    .from("campaigns")
    .insert({
      brand_id: brand.id,
      title: "Test campaign",
      objective: "A clear objective for testing purposes.",
      budget_max_cents: 100_000,
      deadline,
      blind_review: opts.blind ?? false,
      visibility: opts.visibility ?? "public",
    })
    .select("id")
    .single();
  if (error) throw error;
  const d = await brand.client.from("campaign_deliverables").insert({ campaign_id: data.id, deliverable_type_id: await refId("deliverable_types", "short-form-video"), quantity: 1 });
  if (d.error) throw d.error;
  const p = await brand.client.rpc("transition_campaign", { p_campaign_id: data.id, p_status: "published" });
  if (p.error) throw p.error;
  return data.id;
}

/** Creator drafts and submits a proposal. */
export async function submittedProposal(creator: { id: string; client: Client }, campaignId: string) {
  const { data, error } = await creator.client
    .from("proposals")
    .insert({ campaign_id: campaignId, creator_id: creator.id, approach: "A detailed approach to this brief that is long enough.", quote_cents: 80_000 })
    .select("id")
    .single();
  if (error) throw error;
  const d = await creator.client.from("proposal_deliverables").insert({ proposal_id: data.id, deliverable_type_id: await refId("deliverable_types", "short-form-video"), quantity: 1 });
  if (d.error) throw d.error;
  const s = await creator.client.rpc("submit_proposal", { p_proposal_id: data.id });
  if (s.error) throw s.error;
  return data.id;
}
