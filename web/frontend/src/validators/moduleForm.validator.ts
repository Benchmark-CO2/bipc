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
    concreteColumns: concreteElementSchema.optional(),
    concreteBeams: concreteElementSchema.optional(),
    concreteSlabs: concreteElementSchema.optional(),
    formColumns: z.number().nonnegative().optional(),
    formBeams: z.number().nonnegative().optional(),
    formSlabs: z.number().nonnegative().optional(),
    columnNumber: z.number().int().nonnegative().optional(),
    avgBeamSpan: z.number().nonnegative().optional(),
    avgSlabSpan: z.number().nonnegative().optional(),

    // Concrete Wall - seguindo a nova tipagem
    concreteWalls: concreteElementSchema.optional(),
    wallThickness: z.number().nonnegative().optional(),
    slabThickness: z.number().nonnegative().optional(),
    formArea: z.number().nonnegative().optional(),
    wallArea: z.number().nonnegative().optional(),

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
          data.concreteColumns !== undefined &&
          data.concreteBeams !== undefined &&
          data.concreteSlabs !== undefined &&
          data.formColumns !== undefined &&
          data.formBeams !== undefined &&
          data.formSlabs !== undefined &&
          data.columnNumber !== undefined &&
          data.avgBeamSpan !== undefined &&
          data.avgSlabSpan !== undefined
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
          data.concreteWalls !== undefined &&
          data.concreteSlabs !== undefined &&
          data.wallThickness !== undefined &&
          data.slabThickness !== undefined &&
          data.formArea !== undefined &&
          data.wallArea !== undefined
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
