import { z } from "zod";

const baseUnitSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["tower"], {
    required_error: "Selecione um tipo de unidade",
    invalid_type_error: "Tipo de unidade inválido",
  }),
});

export const floorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  area: z.number().positive("Área deve ser um número positivo"),
  height: z.number().positive("Altura deve ser um número positivo"),
  repetition: z
    .number()
    .int()
    .positive("Número de repetições deve ser um número positivo"),
  category: z.enum(
    ["standard_floor", "ground_floor", "basement_floor", "penthouse_floor"],
    {
      required_error: "Selecione uma categoria",
      invalid_type_error: "Categoria inválida",
    }
  ),
});

export type FloorSchema = z.infer<typeof floorSchema>;

const towerFieldsSchema = z.object({
  data: z.object({
    floor_groups: z
      .array(floorSchema)
      .min(1, "Pelo menos um pavimento deve ser adicionado"),
  }),
});

// Schema principal com validação condicional
export const unitFormSchema = baseUnitSchema.merge(towerFieldsSchema).refine(
  (data) => {
    // Se o tipo for "tower", deve ter pelo menos um pavimento
    if (data.type === "tower") {
      return data.data.floor_groups && data.data.floor_groups.length > 0;
    }
    return true;
  },
  {
    message:
      "Pelo menos um pavimento deve ser adicionado para unidades do tipo Tower",
    path: ["data.floor_groups"], // Associa o erro ao campo correto
  }
);

export type UnitFormSchema = z.infer<typeof unitFormSchema>;

// Schema simplificado para edição de unidades (apenas nome)
export const addUnitFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddUnitFormSchema = z.infer<typeof addUnitFormSchema>;
