import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

/**
 * Removes every account (and its data) created by automated tests, so test
 * runs never leave fake users or campaigns in the database.
 *   - DB tests create users at  …@test.makersignal.test
 *   - E2E tests create users at e2e…@example.com and campaigns titled "E2E …"
 */
export async function cleanupTestData() {
  const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const testIds = users
    .filter((u) => u.email?.endsWith("@test.makersignal.test") || /^e2e[a-z0-9]*@example\.com$/.test(u.email ?? ""))
    .map((u) => u.id);

  // Campaigns created by E2E tests (by seeded brands) and every project touching test data.
  const { data: e2eCampaigns } = await admin.from("campaigns").select("id").like("title", "E2E %");
  const campaignIds = (e2eCampaigns ?? []).map((c) => c.id);
  const projectFilters = [
    testIds.length ? `creator_id.in.(${testIds.join(",")})` : null,
    testIds.length ? `brand_id.in.(${testIds.join(",")})` : null,
    campaignIds.length ? `campaign_id.in.(${campaignIds.join(",")})` : null,
  ].filter(Boolean);
  if (projectFilters.length) {
    // Projects are protected from cascading deletes on purpose; remove them explicitly first.
    const { error } = await admin.from("projects").delete().or(projectFilters.join(","));
    if (error) throw error;
  }
  if (testIds.length) {
    // Messages keep their sender (restrict), so remove test users' conversations first.
    const { data: memberships } = await admin.from("conversation_members").select("conversation_id").in("profile_id", testIds);
    const conversationIds = [...new Set((memberships ?? []).map((m) => m.conversation_id))];
    if (conversationIds.length) {
      const { error } = await admin.from("conversations").delete().in("id", conversationIds);
      if (error) throw error;
    }
  }
  if (campaignIds.length) {
    const { error } = await admin.from("campaigns").delete().in("id", campaignIds);
    if (error) throw error;
  }
  for (const id of testIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  return { users: testIds.length, campaigns: campaignIds.length };
}
