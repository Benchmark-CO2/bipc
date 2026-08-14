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
  TFck,
  TSlabType,
} from "@/types/modules";
import { parseNumber } from "@/utils/numbers";
import { z } from "zod";

const stringToNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? parseNumber(val) : val;
  });

const stringToInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const parsed = typeof val === "string" ? parseNumber(val) : val;
    if (isNaN(parsed)) return undefined;
    return Math.round(parsed);
  });

const fckEnumSchema = z.union([
  z.literal(20),
  z.literal(25),
  z.literal(30),
  z.literal(35),
  z.literal(40),
  z.literal(45),
  z.literal(50),
  z.number(),
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
] as const satisfies readonly TSlabType[]);

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

const steelMaterialItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z.object({
    material: steelMaterialEnumSchema.optional(),
    other_name: z.string().optional(),
    resistance: steelResistanceEnumSchema.optional(),
    other_resistance: stringToNumber,
    mass: stringToNumber,
    position: positionSchema.optional(),
  });

const concreteVolumeItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z.object({
    fck: fckEnumSchema.optional(),
    volume: stringToNumber,
    position: positionSchema.optional(),
    customFck: z.boolean().optional(),
  });

const formAreaItemSchema = <TPosition extends z.ZodTypeAny>(
  positionSchema: TPosition,
) =>
  z.object({
    area: stringToNumber,
    position: positionSchema.optional(),
  });

const groutVolumeItemSchema = z.object({
  fgk: z.number().optional(),
  volume: stringToNumber,
  customFgk: z.boolean().optional(),
});

const groutInfoSchema = z.object({
  position: z.enum(["vertical", "horizontal"]).optional(),
  volumes: z.array(groutVolumeItemSchema).optional(),
  steel: z
    .array(steelMaterialItemSchema(z.enum(["vertical", "horizontal"])))
    .optional(),
});

const mortarItemSchema = z.object({
  fak: z.number().optional(),
  volume: stringToNumber,
  customFak: z.boolean().optional(),
});

const blockInfoSchema = z.object({
  type: blockTypeEnumSchema.optional(),
  fbk: z.number().optional(),
  quantity: stringToInt,
  customFbk: z.boolean().optional(),
});

const masonryElementSchema = z.object({
  blocks: z.array(blockInfoSchema).optional(),
  grout: z.array(groutInfoSchema).optional(),
  mortar: z.array(mortarItemSchema).optional(),
});

export function createModuleV2FormSchema() {
  const baseSharedDataSchema = z.object({
    floor_ids: z.array(z.string()).optional(),
    floor_index: z.number().optional(),
    floor_indexes: z.array(z.number()).optional(),
  });

  const baseFoundationDataSchema = z.object({
    unit_id: z.string().optional(),
    raft_area: stringToNumber,
    raft_thickness: stringToNumber,
  });

  const beamColumnDataSchema = baseSharedDataSchema.extend({
    concrete: z
      .array(concreteVolumeItemSchema(beamColumnPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(beamColumnPositionSchema))
      .optional(),
    form: z.array(formAreaItemSchema(beamColumnPositionSchema)).optional(),
    slab_type: slabTypeEnumSchema.optional(),
    column_number: stringToInt,
    beam_number: stringToInt,
    slab_number: stringToInt,
    avg_beam_span: stringToNumber,
    avg_slab_span: stringToNumber,
  });

  const concreteWallDataSchema = baseSharedDataSchema.extend({
    concrete: z
      .array(concreteVolumeItemSchema(concreteWallPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(concreteWallPositionSchema))
      .optional(),
    form: z.array(formAreaItemSchema(concreteWallPositionSchema)).optional(),
    slab_type: slabTypeEnumSchema.optional(),
    wall_thickness: stringToNumber,
    slab_thickness: stringToNumber,
    wall_area: stringToNumber,
    slab_area: stringToNumber,
    beam_number: stringToInt,
    slab_number: stringToInt,
  });

  const structuralMasonryDataSchema = baseSharedDataSchema.extend({
    concrete: z
      .array(concreteVolumeItemSchema(structuralMasonryPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(structuralMasonryPositionSchema))
      .optional(),
    form: z
      .array(formAreaItemSchema(structuralMasonryPositionSchema))
      .optional(),
    slab_type: slabTypeEnumSchema.optional(),
    beam_number: stringToInt,
    slab_number: stringToInt,
    masonry: masonryElementSchema.optional(),
  });

  const raftFoundationDataSchema = baseFoundationDataSchema.extend({
    concrete: z
      .array(concreteVolumeItemSchema(raftFoundationPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(raftFoundationPositionSchema))
      .optional(),
  });

  const pilesFoundationDataSchema = z.object({
    unit_id: z.string().optional(),
    concrete: z
      .array(concreteVolumeItemSchema(pilesFoundationPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(pilesFoundationPositionSchema))
      .optional(),
  });

  const raftPilesFoundationDataSchema = baseFoundationDataSchema.extend({
    concrete: z
      .array(concreteVolumeItemSchema(raftPilesFoundationPositionSchema))
      .optional(),
    steel: z
      .array(steelMaterialItemSchema(raftPilesFoundationPositionSchema))
      .optional(),
  });

  return z.discriminatedUnion("type", [
    z.object({
      type: z.literal("beam_column"),
      data: beamColumnDataSchema,
    }),
    z.object({
      type: z.literal("concrete_wall"),
      data: concreteWallDataSchema,
    }),
    z.object({
      type: z.literal("structural_masonry"),
      data: structuralMasonryDataSchema,
    }),
    z.object({
      type: z.literal("raft_foundation"),
      data: raftFoundationDataSchema,
    }),
    z.object({
      type: z.literal("piles_foundation"),
      data: pilesFoundationDataSchema,
    }),
    z.object({
      type: z.literal("raft_piles_foundation"),
      data: raftPilesFoundationDataSchema,
    }),
  ]);
}

export type ModuleV2FormSchema = z.infer<
  ReturnType<typeof createModuleV2FormSchema>
>;
export type ModuleV2FormInput = z.input<
  ReturnType<typeof createModuleV2FormSchema>
>;

export const moduleFormSchema = createModuleV2FormSchema();

export {
  beamColumnPositionSchema,
  blockTypeEnumSchema,
  concreteVolumeItemSchema,
  concreteWallPositionSchema,
  fckEnumSchema,
  formAreaItemSchema,
  masonryElementSchema,
  pilesFoundationPositionSchema,
  raftFoundationPositionSchema,
  raftPilesFoundationPositionSchema,
  slabTypeEnumSchema,
  steelMaterialEnumSchema,
  steelMaterialItemSchema,
  steelResistanceEnumSchema,
  structuralMasonryPositionSchema,
  z as validatorZod,
};
