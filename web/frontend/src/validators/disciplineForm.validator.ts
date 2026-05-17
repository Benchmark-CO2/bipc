import { Translations } from "@/i18n/translations/pt-BR";
import { z } from "zod";

export function createDisciplineFormSchema(t: Translations) {
  return z.object({
    name: z.string().min(2, t.validators.nameMinLength),
    description: z.string().optional(),
    simulation: z.boolean(),
    permissions_ids: z.array(z.number()),
    users_ids: z.array(z.string()).min(1, t.validators.atLeastOneCollaborator),
  });
}

export type DisciplineFormSchema = z.infer<
  ReturnType<typeof createDisciplineFormSchema>
>;
