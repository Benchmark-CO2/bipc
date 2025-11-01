import { z } from "zod";

export const disciplineFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  simulation: z.boolean(),
  permissions_ids: z.array(z.number()),
  users_ids: z.array(z.string()),
});

export type DisciplineFormSchema = z.infer<typeof disciplineFormSchema>;
