import { z } from "zod";
import type { Translations } from "@/i18n/translations/pt-BR";

// Schemas baseados na nova tipagem type2.ts
function createConcreteVolumeItemSchema(t: Translations) {
  return z.object({
    fck: z.number().min(20).max(45, t.validators.fckRange),
    volume: z.number().positive(t.validators.positiveNumber),
  });
}

function createSteelMassItemSchema(t: Translations) {
  return z.object({
    ca: z.number().refine((val) => val === 50 || val === 60, {
      message: t.validators.caValue,
    }),
    mass: z.number().nonnegative(t.validators.nonNegativeNumber),
  });
}

function createConcreteElementSchema(t: Translations) {
  return z.object({
    volumes: z.array(createConcreteVolumeItemSchema(t)).optional().default([]),
    steel: z.array(createSteelMassItemSchema(t)).optional().default([]),
  });
}

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

export function createModuleFormSchema(t: Translations) {
  const concreteElementSchema = createConcreteElementSchema(t);
  return z
    .object({
      name: z.string().min(3, t.validators.nameMinLength),
      type: z.enum(["beam_column", "concrete_wall"], {
        required_error: t.validators.selectStructureType,
        invalid_type_error: t.validators.invalidStructureType,
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
      message: t.validators.beamColumnRequired,
      path: ["type"],
    },
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
      message: t.validators.concreteWallRequired,
      path: ["type"],
    },
  );
}
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

export type ModuleFormSchema = z.infer<ReturnType<typeof createModuleFormSchema>>;

export function createAddModuleFormSchema(t: Translations) {
  return z.object({
    name: z.string().min(3, t.validators.nameMinLength),
  });
}

export type AddModuleFormSchema = z.infer<ReturnType<typeof createAddModuleFormSchema>>;
