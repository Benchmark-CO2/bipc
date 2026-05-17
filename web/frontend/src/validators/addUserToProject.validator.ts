import { Translations } from "@/i18n/translations/pt-BR";
import { z } from "zod";

export function createAddUserToProjectFormSchema(t: Translations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t.validators.required })
      .email({ message: t.validators.invalidEmail }),
  });
}

export type AddUserToProjectFormSchema = z.infer<
  ReturnType<typeof createAddUserToProjectFormSchema>
>;
