import { t } from "i18next";
import { z } from "zod";

export const forgetPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, {
      message: t("forms.customRequiredField", {
        field: t("forms.fields.email"),
      }),
    })
    .email({
      message: t("forms.invalidEmail"),
    }),
});

export type ForgetPasswordFormSchema = z.infer<typeof forgetPasswordFormSchema>;
