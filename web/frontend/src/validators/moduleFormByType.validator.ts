import {
  TBeamColumnPosition,
  TBlockType,
  TConcreteWallPosition,
  TPilesFoundationPosition,
  TRaftFoundationPosition,
  TRaftPilesFoundationPosition,
  TSteelMaterial,
  TSteelResistance,
  TStructuralMasonryPosition,
} from "@/types/modules";
import { parseNumber } from "@/utils/numbers";
import { z } from "zod";

const stringToNumberGeq = (message: string) =>
  z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseNumber(val) : val))
    .refine((val) => !isNaN(val) && val >= 0, { message });

const fckEnumSchema = z.union([
  z.literal(20),
  z.literal(25),
  z.literal(30),
  z.literal(35),
  z.literal(40),
  z.literal(45),
  z.literal(50),
]);

const blockTypeEnumSchema = z.enum([
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
] as const satisfies readonly TBlockType[]);

const steelMaterialEnumSchema = z.enum([
  "general",
  "rebar",
  "mesh",
  "strand",
  "other",
] as const satisfies readonly TSteelMaterial[]);
const steelResistanceEnumSchema = z.enum([
  "CA50",
  "CA60",
  "CP190",
  "other",
] as const satisfies readonly TSteelResistance[]);

const slabTypeEnumSchema = z.enum([
  "solid",
  "ribbed",
  "mushroom_solid",
  "mushroom_ribbed",
  "flat",
  "band_beam",
  "pt_solid",
  "pt_ribbed",
  "pt_mushroom_solid",
  "pt_mushroom_ribbed",
  "pt_flat",
  "pt_band_beam",
  "trussed",
  "joist",
  "filigree",
  "hollow_core",
  "precast_solid",
  "precast_ribbed",
  "pt_precast",
]);

const steelMaterialItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z
    .object({
      material: steelMaterialEnumSchema,
      other_name: z.string().optional(),
      resistance: steelResistanceEnumSchema,
      other_resistance: z.number().optional(),
      mass: stringToNumberGeq("A massa de aço não pode ser negativa"),
      position: positionSchema,
    })
    .refine(
      (data) => {
        if (data.material === "other") {
          return (
            data.other_name !== undefined && data.other_name.trim().length > 0
          );
        }
        return true;
      },
      {
        message: "Nome do material é obrigatório quando 'Outro' é selecionado",
        path: ["other_name"],
      },
    )
    .refine(
      (data) => {
        if (data.resistance === "other") {
          return (
            data.other_resistance !== undefined &&
            data.other_resistance !== null
          );
        }
        return true;
      },
      {
        message:
          "Resistência customizada é obrigatória quando 'Outro' é selecionado",
        path: ["other_resistance"],
      },
    );

const concreteVolumeItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z.object({
    fck: fckEnumSchema,
    volume: stringToNumberGeq("O volume de concreto não pode ser negativo"),
    position: positionSchema,
    customFck: z.boolean().optional(),
  });

const formAreaItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z.object({
    area: stringToNumberGeq("A área de forma não pode ser negativa"),
    position: positionSchema,
  });

const groutVolumeItemSchema = z.object({
  fgk: z.number(),
  volume: stringToNumberGeq("O volume de graute não pode ser negativo"),
  customFgk: z.boolean().optional(),
});

const groutInfoSchema = z.object({
  position: z.enum(["vertical", "horizontal"]),
  volumes: z
    .array(groutVolumeItemSchema)
    .min(1, "Adicione pelo menos um volume de graute"),
  steel: z
    .array(steelMaterialItemSchema(z.enum(["vertical", "horizontal"])))
    .min(1, "Adicione pelo menos uma armadura de graute"),
});

const mortarItemSchema = z.object({
  fak: z.number(),
  volume: stringToNumberGeq("O volume de argamassa não pode ser negativo"),
  customFak: z.boolean().optional(),
});

const blockInfoSchema = z.object({
  type: blockTypeEnumSchema,
  fbk: z.number(),
  quantity: z.union([z.string(), z.number()]).transform((val) => {
    const parsed = typeof val === "string" ? parseNumber(val) : val;
    if (isNaN(parsed) || parsed < 0) {
      throw new Error("A quantidade deve ser não-negativa");
    }
    return Math.round(parsed);
  }),
  customFbk: z.boolean().optional(),
});

const masonryElementSchema = z.object({
  blocks: z
    .array(blockInfoSchema)
    .min(1, "Adicione pelo menos um tipo de bloco"),
  grout: z
    .array(groutInfoSchema)
    .min(1, "Adicione pelo menos um tipo de graute"),
  mortar: z
    .array(mortarItemSchema)
    .min(1, "Adicione pelo menos um tipo de argamassa"),
});

const beamColumnPositionSchema = z.enum([
  "column",
  "beam",
  "slab",
  "stair",
] as const satisfies readonly TBeamColumnPosition[]);
const concreteWallPositionSchema = z.enum([
  "wall",
  "slab",
  "stair",
] as const satisfies readonly TConcreteWallPosition[]);
const structuralMasonryPositionSchema = z.enum([
  "column",
  "beam",
  "slab",
  "stair",
] as const satisfies readonly TStructuralMasonryPosition[]);
const raftFoundationPositionSchema = z.enum([
  "raft",
] as const satisfies readonly TRaftFoundationPosition[]);
const pilesFoundationPositionSchema = z.enum([
  "pile",
  "block",
  "grade_beam",
  "tie_beam",
] as const satisfies readonly TPilesFoundationPosition[]);
const raftPilesFoundationPositionSchema = z.enum([
  "raft",
  "pile",
] as const satisfies readonly TRaftPilesFoundationPosition[]);

const v2BaseSchema = z.object({
  floor_ids: z.array(z.string()).optional(),
  floor_index: z.number().optional(),
  floor_indexes: z.array(z.number()).optional(),
  unit_id: z.string().optional(),
});

const beamColumnSchemaV2 = v2BaseSchema.extend({
  type: z.literal("beam_column"),
  concrete: z
    .array(concreteVolumeItemSchema(beamColumnPositionSchema))
    .min(1, "Adicione pelo menos um volume de concreto"),
  steel: z
    .array(steelMaterialItemSchema(beamColumnPositionSchema))
    .min(1, "Adicione pelo menos um material de aço"),
  form: z.array(formAreaItemSchema(beamColumnPositionSchema)).optional(),
  slab_type: slabTypeEnumSchema.optional(),
  column_number: stringToNumberGeq(
    "O número de colunas não pode ser negativo",
  ).optional(),
  beam_number: stringToNumberGeq(
    "O número de vigas não pode ser negativo",
  ).optional(),
  slab_number: stringToNumberGeq(
    "O número de lajes não pode ser negativo",
  ).optional(),
  avg_beam_span: stringToNumberGeq(
    "O vão médio de vigas não pode ser negativo",
  ).optional(),
  avg_slab_span: stringToNumberGeq(
    "O vão médio de lajes não pode ser negativo",
  ).optional(),
});

const concreteWallSchemaV2 = v2BaseSchema.extend({
  type: z.literal("concrete_wall"),
  concrete: z
    .array(concreteVolumeItemSchema(concreteWallPositionSchema))
    .min(1, "Adicione pelo menos um volume de concreto"),
  steel: z
    .array(steelMaterialItemSchema(concreteWallPositionSchema))
    .min(1, "Adicione pelo menos um material de aço"),
  form: z.array(formAreaItemSchema(concreteWallPositionSchema)).optional(),
  slab_type: slabTypeEnumSchema.optional(),
  wall_thickness: stringToNumberGeq(
    "A espessura da parede não pode ser negativa",
  ).optional(),
  slab_thickness: stringToNumberGeq(
    "A espessura da laje não pode ser negativa",
  ).optional(),
  wall_area: stringToNumberGeq(
    "A área da parede não pode ser negativa",
  ).optional(),
  slab_area: stringToNumberGeq(
    "A área da laje não pode ser negativa",
  ).optional(),
  beam_number: stringToNumberGeq(
    "O número de vigas não pode ser negativo",
  ).optional(),
  slab_number: stringToNumberGeq(
    "O número de lajes não pode ser negativo",
  ).optional(),
});

const structuralMasonrySchemaV2 = v2BaseSchema.extend({
  type: z.literal("structural_masonry"),
  masonry: masonryElementSchema,
  concrete: z
    .array(concreteVolumeItemSchema(structuralMasonryPositionSchema))
    .optional(),
  steel: z
    .array(steelMaterialItemSchema(structuralMasonryPositionSchema))
    .optional(),
  form: z.array(formAreaItemSchema(structuralMasonryPositionSchema)).optional(),
  slab_type: slabTypeEnumSchema.optional(),
  beam_number: stringToNumberGeq(
    "O número de vigas não pode ser negativo",
  ).optional(),
  slab_number: stringToNumberGeq(
    "O número de lajes não pode ser negativo",
  ).optional(),
});

const raftFoundationSchemaV2 = v2BaseSchema.extend({
  type: z.literal("raft_foundation"),
  concrete: z
    .array(concreteVolumeItemSchema(raftFoundationPositionSchema))
    .min(1, "Adicione pelo menos um volume de concreto do radier"),
  steel: z
    .array(steelMaterialItemSchema(raftFoundationPositionSchema))
    .min(1, "Adicione pelo menos um material de aço do radier"),
  raft_area: z.number().optional(),
  raft_thickness: z.number().optional(),
});

const pilesFoundationSchemaV2 = v2BaseSchema.extend({
  type: z.literal("piles_foundation"),
  concrete: z
    .array(concreteVolumeItemSchema(pilesFoundationPositionSchema))
    .min(1, "Adicione pelo menos um volume de concreto"),
  steel: z
    .array(steelMaterialItemSchema(pilesFoundationPositionSchema))
    .min(1, "Adicione pelo menos um material de aço"),
});

const raftPilesFoundationSchemaV2 = v2BaseSchema.extend({
  type: z.literal("raft_piles_foundation"),
  concrete: z
    .array(concreteVolumeItemSchema(raftPilesFoundationPositionSchema))
    .min(1, "Adicione pelo menos um volume de concreto"),
  steel: z
    .array(steelMaterialItemSchema(raftPilesFoundationPositionSchema))
    .min(1, "Adicione pelo menos um material de aço"),
  raft_area: z.number().optional(),
  raft_thickness: z.number().optional(),
});

export const moduleFormSchema = z.discriminatedUnion("type", [
  beamColumnSchemaV2,
  concreteWallSchemaV2,
  structuralMasonrySchemaV2,
  raftFoundationSchemaV2,
  pilesFoundationSchemaV2,
  raftPilesFoundationSchemaV2,
]);

export type ModuleFormSchema = z.infer<typeof moduleFormSchema>;
export type ModuleFormInput = z.input<typeof moduleFormSchema>;

import type { TModuleGroupedForm } from "@/components/layout/drawer-form-module/aggregate-helpers";
export type ModuleFormState = TModuleGroupedForm;

export const addModuleFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
});

export type AddModuleFormSchema = z.infer<typeof addModuleFormSchema>;
