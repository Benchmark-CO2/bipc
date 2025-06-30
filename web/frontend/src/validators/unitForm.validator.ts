import { z } from "zod";

// Schema base para campos comuns
const baseUnitSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["tower"], {
    required_error: "Selecione um tipo de unidade",
    invalid_type_error: "Tipo de unidade inválido",
  }),
});

// Schema para campos específicos do tipo tower (opcionais por padrão)
const towerFieldsSchema = z.object({
  total_floors: z
    .number()
    .int()
    .positive("O número total de andares deve ser um número positivo")
    .optional(),
  tower_floors: z
    .number()
    .int()
    .nonnegative("O número de andares da torre deve ser um número não negativo")
    .optional(),
  base_floors: z
    .number()
    .int()
    .nonnegative("O número de andares da base deve ser um número não negativo")
    .optional(),
  basement_floors: z
    .number()
    .int()
    .nonnegative(
      "O número de andares do subsolo deve ser um número não negativo"
    )
    .optional(),
  type_floors: z
    .number()
    .int()
    .nonnegative("O número de andares do tipo deve ser um número não negativo")
    .optional(),
  total_area: z
    .number()
    .positive("A área total deve ser um número positivo")
    .optional(),
});

// Schema principal com validação condicional
export const unitFormSchema = baseUnitSchema.merge(towerFieldsSchema).refine(
  (data) => {
    // Se o tipo for "tower", todos os campos específicos são obrigatórios
    if (data.type === "tower") {
      return (
        data.total_floors !== undefined &&
        data.tower_floors !== undefined &&
        data.base_floors !== undefined &&
        data.basement_floors !== undefined &&
        data.type_floors !== undefined &&
        data.total_area !== undefined
      );
    }
    return true;
  },
  {
    message: "Todos os campos são obrigatórios para unidades do tipo Tower",
    path: ["type"], // Associa o erro ao campo type
  }
);

export type UnitFormSchema = z.infer<typeof unitFormSchema>;

// Schema simplificado para edição de unidades (apenas nome)
export const addUnitFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddUnitFormSchema = z.infer<typeof addUnitFormSchema>;
