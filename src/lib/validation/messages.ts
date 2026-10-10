import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters")
    .max(80, "Keep group name under 80 characters"),
  creatorIds: z
    .array(z.string().uuid("Invalid creator ID"))
    .min(1, "Select at least 1 creator for the group")
    .max(50, "A group can have up to 50 creators"),
  campaignId: z.string().uuid().optional().nullable(),
  initialMessage: z
    .string()
    .trim()
    .max(5000, "Keep messages under 5,000 characters")
    .optional()
    .nullable(),
});

export const addGroupMembersSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  creatorIds: z
    .array(z.string().uuid("Invalid creator ID"))
    .min(1, "Select at least 1 creator to add")
    .max(50, "You can add up to 50 creators at once"),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddGroupMembersInput = z.infer<typeof addGroupMembersSchema>;
