import { Translations } from "@/i18n/translations/pt-BR";
import { z } from "zod";

export function createProjectFormSchema(t: Translations) {
  return z.object({
    name: z.string().min(2, t.validators.nameMinLength),
    cep: z.string().optional().or(z.string().min(9, t.validators.invalidCep)),
    state: z.string().min(2, t.validators.required),
    city: z.string().min(2, t.validators.required),
    neighborhood: z
      .string()
      .optional()
      .or(z.string().min(2, t.validators.required)),
    street: z.string().optional().or(z.string().min(3, t.validators.required)),
    number: z.string().optional().or(z.string().min(1, t.validators.required)),
    siop: z.string().optional().or(z.string().max(50)),
    apf: z.string().optional().or(z.string().max(50)),
    phase: z.enum(
      [
        "not_defined",
        "preliminary_study",
        "basic_project",
        "executive_project",
        "released_for_construction",
        "as_built",
      ],
      {
        required_error: t.validators.selectPhase,
        invalid_type_error: t.validators.selectPhase,
      },
    ),
    description: z.string().optional(),
  });
}

export type ProjectFormSchema = z.infer<
  ReturnType<typeof createProjectFormSchema>
>;
