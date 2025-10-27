import { t } from "i18next";
import { z } from "zod";

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", { field: t("signUp.name") }),
      })
      .regex(/^[A-Za-zÀ-ÿ]+( [A-Za-zÀ-ÿ]+)+$/, { message: t("signUp.name") }),
    email: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.professionalEmail"),
        }),
      })
      .email({ message: t("forms.invalidEmail") }),
    password: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.password"),
        }),
      })
      .min(8, { message: t("forms.passwordMinLength", { min: 8 }) }),
    confirmPassword: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.confirmPassword"),
        }),
      })
      .optional(),
    crea_cau: z.string().optional(),

    birthdate: z
      .string()
      .optional()
      .refine(
        (value) => {
          if (!value || value === "") return true; // Campo opcional

          // Remove a máscara para validar
          const cleanValue = value.replace(/\D/g, "");
          if (cleanValue.length !== 8) return false;

          // Parse da data DD/MM/YYYY
          const day = parseInt(cleanValue.substring(0, 2), 10);
          const month = parseInt(cleanValue.substring(2, 4), 10);
          const year = parseInt(cleanValue.substring(4, 8), 10);

          // Valida se é uma data válida
          const date = new Date(year, month - 1, day);
          const now = new Date();

          if (
            date.getDate() !== day ||
            date.getMonth() !== month - 1 ||
            date.getFullYear() !== year ||
            date >= now
          ) {
            return false;
          }

          // Valida idade mínima de 18 anos
          const age = now.getFullYear() - date.getFullYear();
          const monthDiff = now.getMonth() - date.getMonth();
          const dayDiff = now.getDate() - date.getDate();

          const hasHadBirthdayThisYear =
            monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
          const actualAge = hasHadBirthdayThisYear ? age : age - 1;

          return actualAge >= 18;
        },
        { message: t("forms.minimumAge", { age: 18 }) }
      ),
    city: z.string().optional(),
    activity: z.string().optional(),
    enterprise: z.string().optional(),
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
export type RegisterFormSchema = z.infer<typeof registerFormSchema>;
