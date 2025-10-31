import { t } from "i18next";
import { z } from "zod";

export const AddUserToProjectFormSchema = z.object({
  email: z
    .string()
    .email(t("forms.invalidEmail"))
    .min(1, t("forms.requiredField")),
});

export type AddUserToProjectFormSchema = z.infer<
  typeof AddUserToProjectFormSchema
>;
