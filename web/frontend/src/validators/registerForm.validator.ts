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
    crea: z
      .string()
      .min(1, {
        message: t("forms.customRequiredField", { field: t("signUp.crea") }),
      })
      .or(z.literal(""))
      .optional(),

    birthDate: z
      .string({
        message: t("forms.customRequiredField", {
          field: t("signUp.birthDate"),
        }),
      })
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.birthDate"),
        }),
      })
      .refine(
        (value) => {
          if (!value) return false;
          const date = new Date(value);
          const now = new Date();
          if (!(date instanceof Date) || isNaN(date.getTime()) || date >= now) {
            return false;
          }

          const age = now.getFullYear() - date.getFullYear();
          const monthDiff = now.getMonth() - date.getMonth();
          const dayDiff = now.getDate() - date.getDate();

          // Check if birthday has occurred this year
          const hasHadBirthdayThisYear =
            monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
          const actualAge = hasHadBirthdayThisYear ? age : age - 1;

          return actualAge >= 18;
        },
        { message: t("forms.minimumAge", { age: 18 }) }
      )
      .or(z.literal(""))
      .optional(),
    city: z
      .string({
        message: t("forms.customRequiredField", { field: t("signUp.city") }),
      })
      .min(1, {
        message: t("forms.customRequiredField", { field: t("signUp.city") }),
      })
      .or(z.literal(""))
      .optional(),
    activityArea: z
      .string({
        message: t("forms.customRequiredField", {
          field: t("signUp.activityArea"),
        }),
      })
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.activityArea"),
        }),
      })
      .or(z.literal(""))
      .optional(),
    companyName: z
      .string({
        message: t("forms.customRequiredField", {
          field: t("signUp.companyName"),
        }),
      })
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.companyName"),
        }),
      })
      .or(z.literal(""))
      .optional(),
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
