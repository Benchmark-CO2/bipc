import { t } from "i18next";
import { z } from "zod";

export const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("forms.fields.password"),
        }),
      })
      .min(8, { message: t("forms.passwordMinLength", { min: 8 }) }),
    confirmPassword: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("forms.fields.confirmPassword"),
        }),
      }),
  })
  .superRefine((data, ctx) => {
    const { password, confirmPassword } = data;
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: t("forms.passwordsDoNotMatch"),
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordFormSchema = z.infer<typeof resetPasswordFormSchema>;
