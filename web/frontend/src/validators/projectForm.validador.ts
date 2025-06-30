import { z } from "zod";

export const projectFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 3 caracteres"),
  cep: z.string().min(9, "O CEP deve ter pelo menos 8 caracteres").optional(),
  state: z.string().min(2, "O estado deve ter pelo menos 3 caracteres"),
  city: z.string().min(2, "A cidade deve ter pelo menos 3 caracteres"),
  neighborhood: z
    .string()
    .min(2, "O bairro deve ter pelo menos 3 caracteres")
    .optional(),
  street: z
    .string()
    .min(3, "A rua deve ter pelo menos 3 caracteres")
    .optional(),
  number: z.string().min(1, "O número deve ser informado").optional(),
  phase: z.enum(
    [
      "draft",
      "preliminary_study",
      "basic_project",
      "executive_project",
      "released_for_construction",
    ],
    {
      required_error: "Selecione uma fase do projeto",
      invalid_type_error: "Selecione uma fase do projeto",
    }
  ),
  description: z.string().optional(),
  image_url: z
    .instanceof(File, { message: "Selecione uma imagem válida" })
    .optional(),
});

export type ProjectFormSchema = z.infer<typeof projectFormSchema>;
