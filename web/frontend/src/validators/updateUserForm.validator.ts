import { Translations } from "@/i18n/translations/pt-BR";
import { z } from "zod";

export function createUpdateUserFormSchema(
  t: Translations,
  userType: "member" | "company",
) {
  return z
    .object({
      name: z.string().min(1, { message: t.validators.required }),
      email: z.string().optional(),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      crea_cau: z.string().optional(),
      birthdate: z
        .string()
        .optional()
        .refine(
          (value) => {
            if (!value || value === "") return true;
            const cleanValue = value.replace(/\D/g, "");
            if (cleanValue.length !== 8) return false;
            const day = parseInt(cleanValue.substring(0, 2), 10);
            const month = parseInt(cleanValue.substring(2, 4), 10);
            const year = parseInt(cleanValue.substring(4, 8), 10);
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
            const age = now.getFullYear() - date.getFullYear();
            const monthDiff = now.getMonth() - date.getMonth();
            const dayDiff = now.getDate() - date.getDate();
            const hasHadBirthdayThisYear =
              monthDiff > 0 || (monthDiff === 0 && dayDiff >= 0);
            const actualAge = hasHadBirthdayThisYear ? age : age - 1;
            return actualAge >= 18;
          },
          { message: t.validators.minimumAge },
        ),
      city: z.string().optional(),
      activity: z.string().optional(),
      enterprise: z.string().optional(),
      cnpj: z.string().optional(),
      cep: z.string().optional(),
      state: z.string().optional(),
      neighborhood: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (userType === "member") {
        const fullNameRegex = /^[A-Za-zÀ-ÿ]+( [A-Za-zÀ-ÿ]+)+$/;
        if (!fullNameRegex.test(data.name.trim())) {
          ctx.addIssue({
            code: "custom",
            message: t.validators.fullNameRequired,
            path: ["name"],
          });
        }
      }
      const { password, confirmPassword } = data;
      if (password && password.length > 0) {
        if (password.length < 8) {
          ctx.addIssue({
            code: "custom",
            message: t.validators.passwordMinLength,
            path: ["password"],
          });
        }
        if (password !== confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: t.validators.passwordMismatch,
            path: ["confirmPassword"],
          });
        }
      }
    });
}

export type UpdateUserFormSchema = z.infer<
  ReturnType<typeof createUpdateUserFormSchema>
>;
