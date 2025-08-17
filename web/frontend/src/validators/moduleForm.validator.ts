import { z } from "zod";

const concreteSchema = z
  .array(
    z.object({
      fck: z.enum(["20", "25", "30", "35", "40", "45"], {
        required_error: "Selecione um valor de Fck",
        invalid_type_error: "Valor de Fck inválido",
      }),
      volume: z.number().positive("O volume deve ser um número positivo"),
    })
  )
  .optional()
  .refine(
    (items) => {
      if (!items || items.length === 0) return true;
      const fcks = items.map((item) => item.fck);
      return new Set(fcks).size === fcks.length;
    },
    {
      message: "Não deve haver valores de Fck repetidos",
    }
  );

const blockSchema = z
  .array(
    z.object({
      type: z.enum(
        [
          "BL 14x4",
          "BL 14x19",
          "BL 14x34",
          "BL 14x39",
          "BL 14x54",
          "BL 19x4",
          "BL 19x19",
          "BL 19x39",
          "CL 14x19",
          "CL 14x34",
          "CL 14x14",
          "CL 14x39",
          "CL 19x19",
          "CL 19x39",
          "COMP 14x19",
          "COMP 14x39",
          "JOTA 14 x 39 x 19/9",
          "JOTA 14 x 19 x 19/9",
        ],
        {
          required_error: "Selecione um tipo de bloco",
          invalid_type_error: "Tipo de bloco inválido",
        }
      ),
      fbk: z.enum(["02", "04", "06", "08", "10", "12"], {
        required_error: "Selecione um valor de Fbk",
        invalid_type_error: "Valor de Fbk inválido",
      }),
      quantity: z
        .number()
        .int()
        .positive("A quantidade deve ser um número inteiro positivo"),
    })
  )
  .optional()
  .refine(
    (items) => {
      if (!items || items.length === 0) return true;
      const fbks = items.map((item) => item.fbk);
      return new Set(fbks).size === fbks.length;
    },
    {
      message: "Não deve haver valores de Fbk repetidos",
    }
  );

export const moduleFormSchema = z
  .object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    type: z.enum(["beam_column", "concrete_wall", "structural_masonry"], {
      required_error: "Selecione um tipo de estrutura",
      invalid_type_error: "Tipo de estrutura inválido",
    }),
    // floor_repetition: z
    //   .number()
    //   .int()
    //   .positive("A repetição de andares deve ser um número positivo"),
    // floor_area: z
    //   .number()
    //   .positive("A área do andar deve ser um número positivo"),
    // floor_height: z
    //   .number()
    //   .positive("A altura do andar deve ser um número positivo"),

    // Beam Column
    concrete_columns: concreteSchema.optional(),
    concrete_beams: concreteSchema.optional(),
    concrete_slabs: concreteSchema.optional(),
    steel_ca50: z.number().nonnegative().optional(),
    steel_ca60: z.number().nonnegative().optional(),
    form_columns: z.number().nonnegative().optional(),
    form_beams: z.number().nonnegative().optional(),
    form_slabs: z.number().nonnegative().optional(),
    form_total: z.number().nonnegative().optional(),
    column_number: z.number().int().nonnegative().optional(),
    avg_beam_span: z.number().nonnegative().optional(),
    avg_slab_span: z.number().nonnegative().optional(),

    // Concrete Wall
    concrete_walls: concreteSchema.optional(),
    wall_thickness: z.number().nonnegative().optional(),
    slab_thickness: z.number().nonnegative().optional(),
    form_area: z.number().nonnegative().optional(),
    wall_area: z.number().nonnegative().optional(),

    // Structural Masonry
    vertical_grout: concreteSchema.optional(),
    horizontal_grout: concreteSchema.optional(),
    blocks: blockSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.type === "beam_column") {
        return (
          data.concrete_columns !== undefined &&
          data.concrete_beams !== undefined &&
          data.concrete_slabs !== undefined &&
          data.steel_ca50 !== undefined &&
          data.steel_ca60 !== undefined &&
          data.form_columns !== undefined &&
          data.form_beams !== undefined &&
          data.form_slabs !== undefined &&
          data.form_total !== undefined &&
          data.column_number !== undefined &&
          data.avg_beam_span !== undefined &&
          data.avg_slab_span !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Viga Pilar são obrigatórios: concreto (colunas, vigas, lajes), aços (CA50, CA60), formas (colunas, vigas, lajes, total), número de colunas e vãos médios",
      path: ["type"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "concrete_wall") {
        return (
          data.concrete_walls !== undefined &&
          data.concrete_slabs !== undefined &&
          data.steel_ca50 !== undefined &&
          data.steel_ca60 !== undefined &&
          data.wall_thickness !== undefined &&
          data.slab_thickness !== undefined &&
          data.form_area !== undefined &&
          data.wall_area !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Parede de Concreto são obrigatórios: concreto (paredes, lajes), aços (CA50, CA60), espessuras (parede, laje) e áreas (forma, parede)",
      path: ["type"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "structural_masonry") {
        return (
          data.vertical_grout !== undefined &&
          data.horizontal_grout !== undefined &&
          data.steel_ca50 !== undefined &&
          data.steel_ca60 !== undefined &&
          data.blocks !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Alvenaria Estrutural são obrigatórios: graute (vertical, horizontal), aços (CA50, CA60) e blocos",
      path: ["type"],
    }
  );

export type ModuleFormSchema = z.infer<typeof moduleFormSchema>;

export const addModuleFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddModuleFormSchema = z.infer<typeof addModuleFormSchema>;
