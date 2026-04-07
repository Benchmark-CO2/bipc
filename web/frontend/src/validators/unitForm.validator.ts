import { parseNumber } from "@/utils/numbers";
import { z } from "zod";

const baseUnitSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["tower"], {
    required_error: "Selecione um tipo de unidade",
    invalid_type_error: "Tipo de unidade inválido",
  }),
  repetition_count: z
    .number()
    .int()
    .positive("Repetição deve ser maior que zero")
    .optional(),
  housing_units_count: z
    .number()
    .int()
    .positive("Quantidade de unidades habitacionais deve ser maior que zero")
    .optional(),
});

// Schema para criação (com repetition)
export const floorFormSchema = z.object({
  id: z.string().uuid().optional(),
  floor_group: z.string().min(1, "Nome do grupo de pavimento é obrigatório"),
  area: z.string().min(1, "Área é obrigatória"),
  height: z.string().min(1, "Altura é obrigatória"),
  category: z.enum(
    ["standard_floor", "ground_floor", "basement_floor", "penthouse_floor"],
    {
      required_error: "Selecione uma categoria",
      invalid_type_error: "Categoria inválida",
    },
  ),
  index: z.number().int(),
  repetition: z
    .number()
    .int()
    .positive("Quantidade deve ser maior que zero")
    .optional(),
});

// Schema para API (floors individuais após expansão)
export const floorSchema = z.object({
  id: z.string().uuid().optional(),
  floor_group: z.string().min(1, "Nome do grupo de pavimento é obrigatório"),
  area: z
    .string()
    .min(1, "Área é obrigatória")
    .transform((val, ctx) => {
      const num = parseNumber(val);
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Área deve ser um número maior que zero",
        });
        return z.NEVER;
      }
      return num;
    }),
  height: z
    .string()
    .min(1, "Altura é obrigatória")
    .transform((val, ctx) => {
      const num = parseNumber(val);
      if (isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Altura deve ser um número maior que zero",
        });
        return z.NEVER;
      }
      return num;
    }),
  category: z.enum(
    ["standard_floor", "ground_floor", "basement_floor", "penthouse_floor"],
    {
      required_error: "Selecione uma categoria",
      invalid_type_error: "Categoria inválida",
    },
  ),
  index: z.number().int(),
});

// Tipo para o input do formulário (antes da transformação)
export type FloorFormInput = {
  id?: string;
  floor_group: string;
  area: string;
  height: string;
  category:
    | "standard_floor"
    | "ground_floor"
    | "basement_floor"
    | "penthouse_floor";
  index: number;
  repetition?: number; // Opcional - usado apenas no formulário
};

// Tipo após a validação/transformação
export type FloorSchema = z.infer<typeof floorSchema>;

const towerFieldsSchema = z.object({
  data: z.object({
    floors: z
      .array(floorSchema)
      .min(1, "Pelo menos um pavimento deve ser adicionado"),
  }),
});

// Schema principal com validação condicional
export const unitFormSchema = baseUnitSchema.merge(towerFieldsSchema);

// Tipo para o input do formulário (antes da transformação)
export type UnitFormInput = {
  name: string;
  type: "tower";
  housing_units_count?: number;
  repetition_count?: number;
  data: {
    floors: FloorFormInput[];
  };
};

// Tipo após a validação/transformação
export type UnitFormSchema = z.infer<typeof unitFormSchema>;

// Schema simplificado para edição de unidades (apenas nome)
export const addUnitFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddUnitFormSchema = z.infer<typeof addUnitFormSchema>;
