import { z } from "zod";
import { idList, moneyInput, optionalText } from "./common";

export const squadRoleSchema = z.object({
  title: z.string().trim().min(2, "Name the role").max(80),
  description: optionalText(1000),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  deliverableTypeId: z.coerce.number().int().positive().nullable().optional(),
  budget: moneyInput,
  headcount: z.coerce.number().int().min(1).max(20),
  skillIds: idList,
});
