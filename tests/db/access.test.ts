/**
 * Database access rules (RLS, grants and workflow functions), exercised
 * through the real API as real users. Requires the local Supabase stack.
 */
import { describe, expect, it } from "vitest";
import { admin, anon, newBrand, newCreator, newUser, publishedCampaign, refId, submittedProposal } from "./helpers";

describe("roles and profiles", () => {
  it("lets a user pick a role once, never admin, and never change it", async () => {
    const u = await newUser();
    expect((await u.client.rpc("set_initial_role", { p_role: "admin" })).error?.code).toBe("P0001");
    expect((await u.client.rpc("set_initial_role", { p_role: "creator" })).error).toBeNull();
    expect((await u.client.rpc("set_initial_role", { p_role: "brand" })).error?.code).toBe("42501");
  });

  it("does not allow writing the role column directly", async () => {
    const u = await newUser("creator");
    const { error } = await u.client.from("profiles").update({ role: "admin" } as never).eq("id", u.id);
    expect(error).not.toBeNull();
    const { data } = await admin().from("profiles").select("role").eq("id", u.id).single();
    expect(data!.role).toBe("creator");
  });

  it("stops a brand from creating a creator profile", async () => {
    const b = await newUser("brand");
    const { error } = await b.client.from("creator_profiles").insert({ id: b.id, slug: `x-${b.id.slice(0, 8)}`, display_name: "X" });
    expect(error).not.toBeNull();
  });

  it("hides private profile rows and rate limits from anonymous visitors", async () => {
    const a = anon();
    expect((await a.from("profiles").select("id").limit(1)).error).not.toBeNull();
    expect((await a.from("rate_limits").select("key").limit(1)).error).not.toBeNull();
    expect((await a.from("brand_contacts").select("brand_id").limit(1)).error).not.toBeNull();
  });

  it("applies creator visibility: public to all, members to signed-in, hidden to self", async () => {
    const pub = await newCreator("public");
    const mem = await newCreator("members");
    const hid = await newCreator("hidden");
    const visitor = anon();
    const ids = [pub.id, mem.id, hid.id];
    const seen = async (c: ReturnType<typeof anon>) => ((await c.from("creator_profiles").select("id").in("id", ids)).data ?? []).map((r) => r.id).sort();
    expect(await seen(visitor)).toEqual([pub.id]);
    const other = await newUser("brand");
    expect(await seen(other.client)).toEqual([pub.id, mem.id].sort());
    expect(await seen(hid.client)).toContain(hid.id);
  });

  it("keeps brand contact details owner-only", async () => {
    const b = await newBrand();
    await b.client.from("brand_contacts").upsert({ brand_id: b.id, contact_email: "private@example.com" });
    const other = await newBrand();
    expect((await other.client.from("brand_contacts").select("*").eq("brand_id", b.id)).data).toEqual([]);
    expect((await b.client.from("brand_contacts").select("contact_email").eq("brand_id", b.id)).data?.[0]?.contact_email).toBe("private@example.com");
  });
});

describe("campaigns", () => {
  it("only brands create campaigns; drafts are private to the owner", async () => {
    const creator = await newCreator();
    expect((await creator.client.from("campaigns").insert({ brand_id: creator.id, title: "Nope" })).error).not.toBeNull();

    const brand = await newBrand();
    const { data } = await brand.client.from("campaigns").insert({ brand_id: brand.id, title: "Private draft" }).select("id").single();
    expect((await creator.client.from("campaigns").select("id").eq("id", data!.id)).data).toEqual([]);
    expect((await anon().from("campaigns").select("id").eq("id", data!.id)).data).toEqual([]);
  });

  it("blocks direct status changes and enforces publish requirements", async () => {
    const brand = await newBrand();
    const { data } = await brand.client.from("campaigns").insert({ brand_id: brand.id, title: "Incomplete" }).select("id").single();
    expect((await brand.client.from("campaigns").update({ status: "published" } as never).eq("id", data!.id)).error).not.toBeNull();
    const r = await brand.client.rpc("transition_campaign", { p_campaign_id: data!.id, p_status: "published" });
    expect(r.error?.code).toBe("P0001");
    expect(r.error?.message).toMatch(/objective/);
  });

  it("rejects invalid transitions and other brands' changes", async () => {
    const brand = await newBrand();
    const id = await publishedCampaign(brand);
    expect((await brand.client.rpc("transition_campaign", { p_campaign_id: id, p_status: "archived" })).error?.code).toBe("P0001");
    const other = await newBrand();
    expect((await other.client.rpc("transition_campaign", { p_campaign_id: id, p_status: "closed" })).error?.code).toBe("42501");
    const upd = await other.client.from("campaigns").update({ title: "hijack" }).eq("id", id).select("id");
    expect(upd.data).toEqual([]);
  });

  it("shows invite-only campaigns only to invited creators", async () => {
    const brand = await newBrand();
    const id = await publishedCampaign(brand, { visibility: "invite_only" });
    const invited = await newCreator();
    const outsider = await newCreator();
    expect((await brand.client.rpc("invite_creator", { p_campaign_id: id, p_creator_id: invited.id, p_message: "hi" })).error).toBeNull();
    expect((await invited.client.from("campaigns").select("id").eq("id", id)).data).toHaveLength(1);
    expect((await outsider.client.from("campaigns").select("id").eq("id", id)).data).toEqual([]);
  });
});

describe("proposals and the Blind Brief Room", () => {
  it("lets only the owning brand see a submitted proposal", async () => {
    const brand = await newBrand();
    const campaignId = await publishedCampaign(brand);
    const creator = await newCreator();
    const proposalId = await submittedProposal(creator, campaignId);

    expect((await brand.client.from("proposals").select("id").eq("id", proposalId)).data).toHaveLength(1);
    const otherBrand = await newBrand();
    expect((await otherBrand.client.from("proposals").select("id").eq("id", proposalId)).data).toEqual([]);
    const otherCreator = await newCreator();
    expect((await otherCreator.client.from("proposals").select("id").eq("id", proposalId)).data).toEqual([]);
    // Submitted proposals can't be edited directly.
    expect((await creator.client.from("proposals").update({ quote_cents: 1 }).eq("id", proposalId).select("id")).data).toEqual([]);
  });

  it("masks creator identity in blind campaigns until the brand reveals it", async () => {
    const brand = await newBrand();
    const campaignId = await publishedCampaign(brand, { blind: true });
    const creator = await newCreator();
    const proposalId = await submittedProposal(creator, campaignId);

    // Direct table read is blocked while blind.
    expect((await brand.client.from("proposals").select("id").eq("id", proposalId)).data).toEqual([]);
    const masked = (await brand.client.rpc("brand_list_proposals", { p_campaign_id: campaignId })).data![0]!;
    expect(masked.creator_id).toBeNull();
    expect(masked.creator_slug).toBeNull();
    expect(masked.creator_label).toMatch(/^Creator \d+$/);
    // No conversation is opened before reveal.
    expect((await brand.client.rpc("ensure_proposal_conversation", { p_proposal_id: proposalId })).error?.code).toBe("P0001");

    expect((await brand.client.rpc("reveal_proposal_identity", { p_proposal_id: proposalId })).error).toBeNull();
    const revealed = (await brand.client.rpc("brand_list_proposals", { p_campaign_id: campaignId })).data![0]!;
    expect(revealed.creator_id).toBe(creator.id);
  });
});

describe("projects, deliverables, rights and reviews", () => {
  it("runs the full collaboration lifecycle with server-side checks at each step", async () => {
    const brand = await newBrand();
    const campaignId = await publishedCampaign(brand);
    const creator = await newCreator();
    const outsider = await newCreator();
    const proposalId = await submittedProposal(creator, campaignId);

    // Creator can't accept their own proposal.
    expect((await creator.client.rpc("accept_proposal", { p_proposal_id: proposalId })).error?.code).toBe("42501");
    const accepted = await brand.client.rpc("accept_proposal", { p_proposal_id: proposalId });
    expect(accepted.error).toBeNull();
    const projectId = accepted.data as string;

    // Membership controls access.
    expect((await outsider.client.from("projects").select("id").eq("id", projectId)).data).toEqual([]);
    expect((await outsider.client.from("deliverables").select("id").eq("project_id", projectId)).data).toEqual([]);
    expect((await outsider.client.from("rights_records").select("id").eq("project_id", projectId)).data).toEqual([]);

    // Work can't start before both parties agree scope.
    const { data: deliverables } = await creator.client.from("deliverables").select("id").eq("project_id", projectId);
    expect(deliverables).toHaveLength(1);
    const deliverableId = deliverables![0]!.id;
    const early = await creator.client.rpc("submit_deliverable_version", {
      p_deliverable_id: deliverableId, p_notes: "v1", p_storage_path: null as never, p_file_name: null as never, p_mime_type: null as never, p_size_bytes: null as never, p_external_url: "https://example.com/v1",
    });
    expect(early.error?.code).toBe("P0001");
    await brand.client.rpc("agree_project_scope", { p_project_id: projectId });
    await creator.client.rpc("agree_project_scope", { p_project_id: projectId });
    expect((await creator.client.from("projects").select("status").eq("id", projectId).single()).data!.status).toBe("active");

    const submit = (url: string) =>
      creator.client.rpc("submit_deliverable_version", {
        p_deliverable_id: deliverableId, p_notes: "work", p_storage_path: null as never, p_file_name: null as never, p_mime_type: null as never, p_size_bytes: null as never, p_external_url: url,
      });
    // Only the creator submits; only the brand reviews.
    expect((await brand.client.rpc("submit_deliverable_version", {
      p_deliverable_id: deliverableId, p_notes: "x", p_storage_path: null as never, p_file_name: null as never, p_mime_type: null as never, p_size_bytes: null as never, p_external_url: "https://example.com/x",
    })).error?.code).toBe("42501");
    expect((await submit("https://example.com/v1")).error).toBeNull();
    expect((await creator.client.rpc("review_deliverable", { p_deliverable_id: deliverableId, p_decision: "approved", p_body: "" })).error?.code).toBe("42501");
    expect((await brand.client.rpc("review_deliverable", { p_deliverable_id: deliverableId, p_decision: "revision_requested", p_body: "Brighter please" })).error).toBeNull();
    expect((await creator.client.from("projects").select("status").eq("id", projectId).single()).data!.status).toBe("revision_requested");

    // Can't complete while a deliverable is unapproved.
    expect((await brand.client.rpc("complete_project", { p_project_id: projectId })).error?.code).toBe("P0001");

    expect((await submit("https://example.com/v2")).error).toBeNull();
    const versions = (await brand.client.from("deliverable_versions").select("version_number").eq("deliverable_id", deliverableId).order("version_number")).data;
    expect(versions?.map((v) => v.version_number)).toEqual([1, 2]); // v1 kept
    expect((await brand.client.rpc("review_deliverable", { p_deliverable_id: deliverableId, p_decision: "approved", p_body: "Great" })).error).toBeNull();

    // Rights Passport: brand submits, creator approves the current revision; stale approvals fail.
    const { data: rights } = await brand.client.from("rights_records").select("id, revision").eq("project_id", projectId).single();
    const terms = { title: "Usage", organic_use: true, paid_ads_use: false, territory: "Worldwide", exclusivity: "none", ai_training_allowed: false };
    expect((await outsider.client.rpc("save_rights_record", { p_project_id: projectId, p_record_id: rights!.id, p_terms: terms, p_platform_ids: [], p_submit: true })).error?.code).toBe("42501");
    expect((await brand.client.rpc("save_rights_record", { p_project_id: projectId, p_record_id: rights!.id, p_terms: terms, p_platform_ids: [], p_submit: true })).error).toBeNull();
    const after = (await creator.client.from("rights_records").select("revision, status, ai_training_allowed").eq("id", rights!.id).single()).data!;
    expect(after.status).toBe("awaiting_creator");
    expect(after.ai_training_allowed).toBe(false);
    expect((await brand.client.rpc("approve_rights_record", { p_record_id: rights!.id, p_revision: after.revision })).error?.code).toBe("P0001");
    expect((await creator.client.rpc("approve_rights_record", { p_record_id: rights!.id, p_revision: after.revision - 1 })).error?.code).toBe("P0001");
    expect((await creator.client.rpc("approve_rights_record", { p_record_id: rights!.id, p_revision: after.revision })).error).toBeNull();
    expect((await brand.client.from("rights_records").select("status").eq("id", rights!.id).single()).data!.status).toBe("agreed");

    // Reviews only after completion, once per direction.
    expect((await brand.client.rpc("submit_review", { p_project_id: projectId, p_rating: 5, p_body: "early" })).error?.code).toBe("P0001");
    expect((await brand.client.rpc("complete_project", { p_project_id: projectId })).error).toBeNull();
    expect((await brand.client.rpc("submit_review", { p_project_id: projectId, p_rating: 5, p_body: "Excellent" })).error).toBeNull();
    expect((await brand.client.rpc("submit_review", { p_project_id: projectId, p_rating: 4, p_body: "Again" })).error?.code).toBe("P0001");
    expect((await creator.client.rpc("submit_review", { p_project_id: projectId, p_rating: 5, p_body: "Clear brief" })).error).toBeNull();
    expect((await outsider.client.rpc("submit_review", { p_project_id: projectId, p_rating: 1, p_body: "x" })).error?.code).toBe("42501");

    // Audit trail recorded.
    const { data: audit } = await brand.client.from("audit_logs").select("action").eq("project_id", projectId);
    expect(audit!.map((a) => a.action)).toEqual(expect.arrayContaining(["project_created", "deliverable_submitted", "deliverable_revision_requested", "rights_agreed", "project_completed"]));
  });
});

describe("messaging", () => {
  it("only conversation members read or post messages", async () => {
    const brand = await newBrand();
    const campaignId = await publishedCampaign(brand);
    const creator = await newCreator();
    const proposalId = await submittedProposal(creator, campaignId);
    const { data: conv } = await creator.client.from("conversations").select("id").eq("proposal_id", proposalId).single();
    expect(conv).not.toBeNull();

    expect((await creator.client.from("messages").insert({ conversation_id: conv!.id, sender_id: creator.id, body: "Hello!" })).error).toBeNull();
    expect((await brand.client.from("messages").select("body").eq("conversation_id", conv!.id)).data?.[0]?.body).toBe("Hello!");

    const outsider = await newCreator();
    expect((await outsider.client.from("messages").select("id").eq("conversation_id", conv!.id)).data).toEqual([]);
    expect((await outsider.client.from("messages").insert({ conversation_id: conv!.id, sender_id: outsider.id, body: "intrude" })).error).not.toBeNull();
    // Can't impersonate another sender.
    expect((await brand.client.from("messages").insert({ conversation_id: conv!.id, sender_id: creator.id, body: "spoof" })).error).not.toBeNull();

    // The brand was notified.
    const { data: notes } = await brand.client.from("notifications").select("type").eq("entity_id", conv!.id);
    expect(notes!.map((n) => n.type)).toContain("message_received");
  });
});

describe("private deliverable storage", () => {
  it("allows only the project creator to upload and members to read", async () => {
    const brand = await newBrand();
    const campaignId = await publishedCampaign(brand);
    const creator = await newCreator();
    const proposalId = await submittedProposal(creator, campaignId);
    const projectId = (await brand.client.rpc("accept_proposal", { p_proposal_id: proposalId })).data as string;
    await brand.client.rpc("agree_project_scope", { p_project_id: projectId });
    await creator.client.rpc("agree_project_scope", { p_project_id: projectId });

    const path = `${projectId}/test-${Date.now()}.txt`;
    const file = new Blob(["hello"], { type: "text/plain" });
    expect((await brand.client.storage.from("deliverables").upload(path, file)).error).not.toBeNull();
    expect((await creator.client.storage.from("deliverables").upload(path, file)).error).toBeNull();
    expect((await brand.client.storage.from("deliverables").createSignedUrl(path, 60)).error).toBeNull();
    const outsider = await newCreator();
    expect((await outsider.client.storage.from("deliverables").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await outsider.client.storage.from("deliverables").upload(`${projectId}/evil.txt`, file)).error).not.toBeNull();
  });

  it("keeps public-bucket uploads inside the user's own folder", async () => {
    const a = await newCreator();
    const b = await newCreator();
    const img = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    expect((await a.client.storage.from("avatars").upload(`${a.id}/me.png`, img)).error).toBeNull();
    expect((await a.client.storage.from("avatars").upload(`${b.id}/not-mine.png`, img)).error).not.toBeNull();
  });
});

describe("search", () => {
  it("returns only published campaigns and non-hidden creators", async () => {
    const brand = await newBrand();
    const pub = await publishedCampaign(brand);
    const { data: draft } = await brand.client.from("campaigns").insert({ brand_id: brand.id, title: "Draft only" }).select("id").single();
    const results = (await anon().rpc("search_campaigns", { p_limit: 60 })).data!.map((r) => r.id);
    expect(results).toContain(pub);
    expect(results).not.toContain(draft!.id);

    const hidden = await newCreator("hidden");
    const creators = (await anon().rpc("search_creators", { p_limit: 60, p_sort: "newest" })).data!.map((r) => r.id);
    expect(creators).not.toContain(hidden.id);
    expect(await refId("platforms", "instagram")).toBeGreaterThan(0);
  });
});
