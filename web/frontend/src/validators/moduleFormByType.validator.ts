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

const blockItemSchema = z
  .object({
    type: z.enum([
      "inteiro (14x19x29)",
      "meio (14x19x14)",
      "amarração T (14x19x44)",
      "canaleta inteira (14x19x29)",
      "meia canaleta (14x19x14)",
      "inteiro (14x19x39)",
      "meio (14x19x19)",
      "amarração T (14x19x54)",
      "amarração L (14x19x34)",
      "canaleta  inteira (14x19x39)",
      "canaleta de amarração (14x19x34)",
      "meia canaleta (14x19x19)",
      "compensador 1/4 (14x19x9)",
      "compensador 1/8 (14x19x4)",
      "inteiro (19x19x39)",
      "meio (19x19x19)",
      "canaleta inteira (19x19x39)",
      "meia canaleta (19x19x19)",
      "compensador 1/4 (19x19x9)",
      "compensador 1/8 (19x19x4)",
    ]),
    fbk: z.number(),
    quantity: z.number().int().positive("A quantidade deve ser positiva"),
    customFbk: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customFbk) {
      const validFbks = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26];
      if (!validFbks.includes(data.fbk)) {
        ctx.addIssue({
          path: ["fbk"],
          code: "custom",
          message: "Fbk deve ser 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24 ou 26",
        });
      }
    }
  })
  .transform((data) => {
    const { customFbk, ...rest } = data;
    return rest;
  });

const groutVolumeItemSchema = z
  .object({
    fgk: z.number(),
    volume: z.number().positive("O volume deve ser positivo"),
    customFgk: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customFgk) {
      const validFgks = [15, 20, 25, 30];
      if (!validFgks.includes(data.fgk)) {
        ctx.addIssue({
          path: ["fgk"],
          code: "custom",
          message: "Fgk deve ser 15, 20, 25 ou 30",
        });
      }
    }
  })
  .transform((data) => {
    const { customFgk, ...rest } = data;
    return rest;
  });

const groutItemSchema = z.object({
  type: z.enum(["vertical", "horizontal"]),
  volumes: z
    .array(groutVolumeItemSchema)
    .min(1, "Adicione pelo menos um volume"),
  steel: z
    .array(steelMassItemSchema)
    .min(1, "Adicione pelo menos uma armadura"),
});

const mortarItemSchema = z
  .object({
    fak: z.number(),
    volume: z.number().positive("O volume deve ser positivo"),
    customFak: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customFak) {
      const validFaks = [4.5, 8, 14];
      if (!validFaks.includes(data.fak)) {
        ctx.addIssue({
          path: ["fak"],
          code: "custom",
          message: "Fak deve ser 4.5, 8 ou 14",
        });
      }
    }
  })
  .transform((data) => {
    const { customFak, ...rest } = data;
    return rest;
  });

export const moduleFormSchema = z
  .object({
    type: z.enum(["beam_column", "concrete_wall", "structural_masonry"], {
      required_error: "Selecione um tipo de estrutura",
      invalid_type_error: "Tipo de estrutura inválido",
    }),

    concrete_columns: concreteElementSchema.optional(),
    concrete_beams: concreteElementSchema.optional(),
    concrete_slabs: concreteElementSchema.optional(),
    form_columns: z.number().nonnegative().optional(),
    form_beams: z.number().nonnegative().optional(),
    form_slabs: z.number().nonnegative().optional(),
    column_number: z.number().int().nonnegative().optional(),
    avg_beam_span: z.number().nonnegative().optional(),
    avg_slab_span: z.number().nonnegative().optional(),

    concrete_walls: concreteElementSchema.optional(),
    wall_thickness: z.number().nonnegative().optional(),
    slab_thickness: z.number().nonnegative().optional(),
    wall_area: z.number().nonnegative().optional(),
    slab_area: z.number().nonnegative().optional(),
    wall_form_area: z.number().nonnegative().optional(),
    slab_form_area: z.number().nonnegative().optional(),

    blocks: z.array(blockItemSchema).optional(),
    grout: z
      .array(groutItemSchema)
      .min(1, "Adicione pelo menos um tipo de graute")
      .optional(),
    mortar: z.array(mortarItemSchema).optional(),
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
  )
  .refine(
    (data) => {
      if (data.type === "structural_masonry") {
        return (
          data.blocks !== undefined &&
          data.grout !== undefined &&
          data.mortar !== undefined &&
          data.concrete_slabs !== undefined
        );
      }
      return true;
    },
    {
      message:
        "Para Alvenaria Estrutural são obrigatórios: blocos, graute, argamassa e laje de concreto",
      path: ["type"],
    }
  );

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
