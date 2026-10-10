import { describe, expect, it } from "vitest";
import { createGroupSchema, addGroupMembersSchema } from "@/lib/validation/messages";

describe("createGroupSchema", () => {
  const validUuid1 = "6e48f1d1-a979-48de-8026-2d96f37f5e7b";
  const validUuid2 = "81f790d9-7a2e-49eb-9a9e-2cd05d6c45f1";
  const campaignUuid = "52101167-90a3-4fad-93b2-f2a6d9d4366e";

  it("accepts valid creator group input", () => {
    const res = createGroupSchema.safeParse({
      name: "Summer UGC Squad",
      creatorIds: [validUuid1, validUuid2],
      campaignId: campaignUuid,
      initialMessage: "Welcome to our brand squad!",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Summer UGC Squad");
      expect(res.data.creatorIds).toHaveLength(2);
      expect(res.data.campaignId).toBe(campaignUuid);
      expect(res.data.initialMessage).toBe("Welcome to our brand squad!");
    }
  });

  it("rejects empty group name", () => {
    const res = createGroupSchema.safeParse({
      name: "  ",
      creatorIds: [validUuid1],
    });
    expect(res.success).toBe(false);
  });

  it("rejects when no creators are selected", () => {
    const res = createGroupSchema.safeParse({
      name: "Empty Group",
      creatorIds: [],
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid creator UUIDs", () => {
    const res = createGroupSchema.safeParse({
      name: "Invalid ID Group",
      creatorIds: ["not-a-uuid"],
    });
    expect(res.success).toBe(false);
  });

  it("allows group creation without campaign or initial message", () => {
    const res = createGroupSchema.safeParse({
      name: "General Creators",
      creatorIds: [validUuid1],
    });
    expect(res.success).toBe(true);
  });
});

describe("addGroupMembersSchema", () => {
  const convUuid = "3bddd435-9bfe-475e-a3fa-f4356a7863ed";
  const creatorUuid = "6e48f1d1-a979-48de-8026-2d96f37f5e7b";

  it("accepts valid input", () => {
    const res = addGroupMembersSchema.safeParse({
      conversationId: convUuid,
      creatorIds: [creatorUuid],
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid conversation ID", () => {
    const res = addGroupMembersSchema.safeParse({
      conversationId: "invalid",
      creatorIds: [creatorUuid],
    });
    expect(res.success).toBe(false);
  });
});
