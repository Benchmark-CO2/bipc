import { z } from "zod";

// Schemas baseados na nova tipagem type2.ts
const concreteVolumeItemSchema = z
  .object({
    fck: z.number(),
    volume: z.number().positive("O volume deve ser um número positivo"),
    customFck: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

const steelMassItemSchema = z
  .object({
    ca: z.number().nonnegative("O CA deve ser um número não negativo"),
    mass: z.number().nonnegative("A massa deve ser um número não negativo"),
    customCa: z.boolean().optional(),
  })
  .transform((data) => {
    const { customCa, ...rest } = data;
    return rest;
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
    wall_area: z.number().nonnegative().optional(),
    slab_area: z.number().nonnegative().optional(),
    wall_form_area: z.number().nonnegative().optional(),
    slab_form_area: z.number().nonnegative().optional(),

    // Structural Masonry (comentado por enquanto)
    // vertical_grout: concreteElementSchema.optional(),
    // horizontal_grout: concreteElementSchema.optional(),
    // blocks: blockSchema.optional(),
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
          data.slab_thickness !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Parede de Concreto são obrigatórios: concreto (paredes, lajes) e espessuras (parede, laje)",
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
    data.concrete_columns?.volumes?.length &&
    data.concrete_beams?.volumes?.length &&
    data.concrete_slabs?.volumes?.length &&
    data.form_columns !== undefined &&
    data.form_beams !== undefined &&
    data.form_slabs !== undefined &&
    data.column_number !== undefined &&
    data.avg_beam_span !== undefined &&
    data.avg_slab_span !== undefined
  );
};

export const validateConcreteWallData = (data: Partial<ModuleFormSchema>) => {
  return (
    data.type === "concrete_wall" &&
    data.concrete_walls?.volumes?.length &&
    data.concrete_slabs?.volumes?.length &&
    data.wall_thickness !== undefined &&
    data.slab_thickness !== undefined
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
