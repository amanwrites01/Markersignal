import { z } from "zod";
import { passwordSchema } from "./auth";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(72),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" })
  .refine((v) => v.password !== v.currentPassword, { path: ["password"], message: "Choose a different password from your current one" });

export const deletionRequestSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeletionRequestInput = z.input<typeof deletionRequestSchema>;
