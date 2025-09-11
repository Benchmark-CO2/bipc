import { z } from "zod";

// Schemas baseados na nova tipagem type2.ts
const concreteVolumeItemSchema = z.object({
  fck: z.number().min(20).max(45, "Fck deve estar entre 20 e 45"),
  volume: z.number().positive("O volume deve ser um número positivo"),
});

const steelMassItemSchema = z.object({
  ca: z.number().refine((val) => val === 50 || val === 60, {
    message: "CA deve ser 50 ou 60",
  }),
  mass: z.number().nonnegative("A massa deve ser um número não negativo"),
});

const concreteElementSchema = z.object({
  volumes: z.array(concreteVolumeItemSchema).optional().default([]),
  steel: z.array(steelMassItemSchema).optional().default([]),
});

// Schemas para structural masonry (comentado pois ainda não foi definido)
// const blockSchema = z
//   .array(
//     z.object({
//       type: z.enum([...]), // será definido depois
//       fbk: z.number(),
//       quantity: z.number().int().positive(),
//     })
//   )
//   .optional();

export const moduleFormSchema = z
  .object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    type: z.enum(["beam_column", "concrete_wall"], {
      // removed structural_masonry for now
      required_error: "Selecione um tipo de estrutura",
      invalid_type_error: "Tipo de estrutura inválido",
    }),

    // Beam Column - seguindo a nova tipagem
    concrete_columns: concreteElementSchema.optional(),
    concrete_beams: concreteElementSchema.optional(),
    concrete_slabs: concreteElementSchema.optional(),
    form_columns: z.number().nonnegative().optional(),
    form_beams: z.number().nonnegative().optional(),
    form_slabs: z.number().nonnegative().optional(),
    column_number: z.number().int().nonnegative().optional(),
    avg_beam_span: z.number().nonnegative().optional(),
    avg_slab_span: z.number().nonnegative().optional(),

    // Concrete Wall - seguindo a nova tipagem
    concrete_walls: concreteElementSchema.optional(),
    wall_thickness: z.number().nonnegative().optional(),
    slab_thickness: z.number().nonnegative().optional(),
    form_area: z.number().nonnegative().optional(),
    wall_area: z.number().nonnegative().optional(),

    // Structural Masonry (comentado por enquanto)
    // descomentei pra parar de dar erro, mas ta tudo como any
    vertical_grout: z.any().optional(),
    horizontal_grout: z.any().optional(),
    blocks: z.any().optional(), // será definido depois
    steel_ca50: z.any().optional(),
    steel_ca60: z.any().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "beam_column") {
        return (
          data.concrete_columns !== undefined &&
          data.concrete_beams !== undefined &&
          data.concrete_slabs !== undefined &&
          data.form_columns !== undefined &&
          data.form_beams !== undefined &&
          data.form_slabs !== undefined &&
          data.column_number !== undefined &&
          data.avg_beam_span !== undefined &&
          data.avg_slab_span !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Viga Pilar são obrigatórios: concreto (colunas, vigas, lajes), formas (colunas, vigas, lajes), número de colunas e vãos médios",
      path: ["type"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "concrete_wall") {
        return (
          data.concrete_walls !== undefined &&
          data.concrete_slabs !== undefined &&
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
        "Para Parede de Concreto são obrigatórios: concreto (paredes, lajes), espessuras (parede, laje) e áreas (forma, parede)",
      path: ["type"],
    }
  );
// Comentado: validação para structural masonry
// .refine(
//   (data) => {
//     if (data.type === "structural_masonry") {
//       return (
//         data.vertical_grout !== undefined &&
//         data.horizontal_grout !== undefined &&
//         data.blocks !== undefined
//       );
//     }
//     return true;
//   },
//   {
//     message:
//       "Para Alvenaria Estrutural são obrigatórios: graute (vertical, horizontal) e blocos",
//     path: ["type"],
//   }
// );

export type ModuleFormSchema = z.infer<typeof moduleFormSchema>;

export const addModuleFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddModuleFormSchema = z.infer<typeof addModuleFormSchema>;
