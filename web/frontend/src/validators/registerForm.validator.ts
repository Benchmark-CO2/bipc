import { z } from 'zod';

export const registerFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Nome  é obrigatório' })
    .regex(/^[a-zA-Z]+ [a-zA-Z]+$/, { message: 'Please enter your full name' }),
  email: z
    .string()
    .min(1, { message: 'Email  é obrigatório' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(1, { message: 'Senha é obrigatória' })
    .min(8, { message: 'Senha precisa ter mais que 8 caracteres' }),
  confirmPassword: z
    .string()
    .min(1, { message: 'Confirmação de senha  é obrigatória' })
}).superRefine((data, ctx) => {
  const { password, confirmPassword } = data;
  if (password !== confirmPassword) {
    ctx.addIssue({
      code: 'custom',
      message: 'Senhas não coincidem',
      path: ['confirmPassword']
    })
  }
});
export type RegisterFormSchema = z.infer<typeof registerFormSchema>;