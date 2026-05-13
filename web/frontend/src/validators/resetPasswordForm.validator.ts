import { Translations } from "@/i18n/translations/pt-BR";
import { z } from "zod";

export function createResetPasswordFormSchema(t: Translations) {
  return z
    .object({
      password: z
        .string()
        .min(1, { message: t.validators.required })
        .min(8, { message: t.validators.passwordMinLength }),
      confirmPassword: z
        .string()
        .min(1, { message: t.validators.required }),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: t.validators.passwordMismatch,
          path: ["confirmPassword"],
        });
      }
    });
}

export type ResetPasswordFormSchema = z.infer<
  ReturnType<typeof createResetPasswordFormSchema>
>;
