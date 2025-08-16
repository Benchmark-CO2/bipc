import { z } from "zod";

const baseUnitSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["tower"], {
    required_error: "Selecione um tipo de unidade",
    invalid_type_error: "Tipo de unidade inválido",
  }),
});

export const floorSchema = z.object({
  tower_name: z.string().min(1, "Nome da torre é obrigatório"),
  area: z.number().positive("Área deve ser um número positivo"),
  height: z.number().positive("Altura deve ser um número positivo"),
  repetition_number: z
    .number()
    .int()
    .positive("Número de repetições deve ser um número positivo"),
  underground: z.boolean(),
  color: z.string().min(1, "Cor é obrigatória"),
  position: z
    .number()
    .int()
    .nonnegative("Posição deve ser um número não negativo"),
});

export type FloorSchema = z.infer<typeof floorSchema>;

const towerFieldsSchema = z.object({
  floors: z
    .array(floorSchema)
    .min(1, "Pelo menos um pavimento deve ser adicionado"),
});

// Schema principal com validação condicional
export const unitFormSchema = baseUnitSchema.merge(towerFieldsSchema).refine(
  (data) => {
    // Se o tipo for "tower", deve ter pelo menos um pavimento
    if (data.type === "tower") {
      return data.floors && data.floors.length > 0;
    }
    return true;
  },
  {
    message:
      "Pelo menos um pavimento deve ser adicionado para unidades do tipo Tower",
    path: ["floors"], // Associa o erro ao campo floors
  }
);

export type UnitFormSchema = z.infer<typeof unitFormSchema>;

// Schema simplificado para edição de unidades (apenas nome)
export const addUnitFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddUnitFormSchema = z.infer<typeof addUnitFormSchema>;
