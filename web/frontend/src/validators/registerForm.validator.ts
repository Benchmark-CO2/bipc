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
      .string({
        message: t("forms.customRequiredField", { field: t("signUp.crea") }),
      })
      .min(1, {
        message: t("forms.customRequiredField", { field: t("signUp.crea") }),
      })
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
          const date = new Date(value);
          const now = new Date();
          return (
            date instanceof Date &&
            !isNaN(date.getTime()) &&
            date < now &&
            now.getFullYear() - date.getFullYear() >= 18
          );
        },
        { message: t("forms.minimumAge", { age: 18 }) }
      )
      .optional(),
    city: z
      .string({
        message: t("forms.customRequiredField", { field: t("signUp.city") }),
      })
      .min(1, {
        message: t("forms.customRequiredField", { field: t("signUp.city") }),
      })
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
      .optional(),
    professionalEmail: z
      .string({
        message: t("forms.customRequiredField", {
          field: t("signUp.professionalEmail"),
        }),
      })
      .min(1, {
        message: t("forms.customRequiredField", {
          field: t("signUp.professionalEmail"),
        }),
      })
      .email({ message: t("forms.invalidEmail") })
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
