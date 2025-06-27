import { t } from 'i18next';
import { z } from 'zod';

export const registerFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: t('forms.customRequiredField', { field: t('forms.fields.name') }) })
    .regex(/^[A-Za-zÀ-ÿ]+( [A-Za-zÀ-ÿ]+)+$/, { message: t('forms.fullNameRequired') }),
  email: z
    .string()
    .min(1, { message: t('forms.customRequiredField', {
      field: t('forms.fields.email')
    }) })
    .email({ message: t('forms.invalidEmail') }),
  password: z
    .string()
    .min(1, { message: t('forms.customRequiredField', { field: t('forms.fields.password') }) })
    .min(8, { message: t('forms.passwordMinLength', { min: 8 }) }),
  confirmPassword: z
    .string()
    .min(1, { message: t('forms.customRequiredField', { field: t('forms.fields.confirmPassword') }) })
}).superRefine((data, ctx) => {
  const { password, confirmPassword } = data;
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: t('forms.passwordsDoNotMatch'),
      path: ['confirmPassword']
    })
  }
});
export type RegisterFormSchema = z.infer<typeof registerFormSchema>;