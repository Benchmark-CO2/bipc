import { z } from "zod";

// Schemas baseados na nova tipagem type2.ts
const concreteVolumeItemSchema = z.object({
  fck: z.number(),
  volume: z.number().positive("O volume deve ser um número positivo"),
  customFck: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.customFck) {
    if (data.fck < 20 || data.fck > 45) {
      ctx.addIssue({
        path: ["fck"],
        code: "custom",
        message: "Fck deve estar entre 20 e 45",
      });
    }
  }
})
.transform((data) => {
  const { customFck, ...rest } = data;
  return rest;
})

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

// Schema flexível que aceita todos os campos
export const moduleFormSchema = z
  .object({
    // name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
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
    // vertical_grout: concreteElementSchema.optional(),
    // horizontal_grout: concreteElementSchema.optional(),
    // blocks: blockSchema.optional(),
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

// Tipos inferred
export type ModuleFormSchema = z.infer<typeof moduleFormSchema>;

// Funções auxiliares para validação específica por tipo
export const validateBeamColumnData = (data: Partial<ModuleFormSchema>) => {
  return (
    data.type === "beam_column" &&
    data.concreteColumns?.volumes?.length &&
    data.concreteBeams?.volumes?.length &&
    data.concreteSlabs?.volumes?.length &&
    data.formColumns !== undefined &&
    data.formBeams !== undefined &&
    data.formSlabs !== undefined &&
    data.columnNumber !== undefined &&
    data.avgBeamSpan !== undefined &&
    data.avgSlabSpan !== undefined
  );
};

export const validateConcreteWallData = (data: Partial<ModuleFormSchema>) => {
  return (
    data.type === "concrete_wall" &&
    data.concreteWalls?.volumes?.length &&
    data.concreteSlabs?.volumes?.length &&
    data.wallThickness !== undefined &&
    data.slabThickness !== undefined &&
    data.formArea !== undefined &&
    data.wallArea !== undefined
  );
};

// Comentado: validação para structural masonry
// export const validateStructuralMasonryData = (
//   data: Partial<ModuleFormSchema>
// ) => {
//   return (
//     data.type === "structural_masonry" &&
//     data.vertical_grout?.volumes?.length &&
//     data.horizontal_grout?.volumes?.length &&
//     data.blocks?.length
//   );
// };

// Schema para adicionar módulo (apenas nome)
export const addModuleFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddModuleFormSchema = z.infer<typeof addModuleFormSchema>;
