import { parseNumber } from "@/utils/numbers";
import { z } from "zod";

const stringToNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? parseNumber(val) : val;
  });

const stringToInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .nullable()
  .transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    const parsed = typeof val === "string" ? parseNumber(val) : val;
    if (isNaN(parsed)) return undefined;
    return Math.round(parsed);
  });

const permissiveNumber = z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable().transform((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  return typeof v === "string" ? parseNumber(v) : v;
});

const permissiveInt = z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable().transform((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  const p = typeof v === "string" ? parseNumber(v) : v;
  if (isNaN(p)) return undefined;
  return Math.round(p);
});

const permissiveString = z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable().transform((v) => {
  if (v === undefined || v === null) return undefined;
  return String(v);
});

const steelMaterialItemSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const concreteVolumeItemSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const formAreaItemSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const groutVolumeItemSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const groutInfoSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const mortarItemSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const blockInfoSchema = z.object({}).catchall(z.unknown()).optional().nullable();

const masonryElementSchema = z.object({
  blocks: z.array(z.unknown()).optional().nullable(),
  grout: z.array(z.unknown()).optional().nullable(),
  mortar: z.array(z.unknown()).optional().nullable(),
}).catchall(z.unknown()).optional().nullable();

const permissiveRecord = z.object({}).catchall(z.unknown()).optional().nullable();

export function createModuleV2FormSchema() {
  const beamColumnDataSchema = z.object({
    floor_ids: z.array(z.string()).optional().nullable(),
    floor_index: permissiveNumber,
    floor_indexes: z.array(z.unknown()).optional().nullable(),
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
    form: z.array(z.unknown()).optional().nullable(),
    slab_type: permissiveString,
    column_number: permissiveInt,
    beam_number: permissiveInt,
    slab_number: permissiveInt,
    avg_beam_span: permissiveNumber,
    avg_slab_span: permissiveNumber,
  }).catchall(z.unknown());

  const concreteWallDataSchema = z.object({
    floor_ids: z.array(z.string()).optional().nullable(),
    floor_index: permissiveNumber,
    floor_indexes: z.array(z.unknown()).optional().nullable(),
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
    form: z.array(z.unknown()).optional().nullable(),
    slab_type: permissiveString,
    wall_thickness: permissiveNumber,
    slab_thickness: permissiveNumber,
    wall_area: permissiveNumber,
    slab_area: permissiveNumber,
    beam_number: permissiveInt,
    slab_number: permissiveInt,
  }).catchall(z.unknown());

  const structuralMasonryDataSchema = z.object({
    floor_ids: z.array(z.string()).optional().nullable(),
    floor_index: permissiveNumber,
    floor_indexes: z.array(z.unknown()).optional().nullable(),
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
    form: z.array(z.unknown()).optional().nullable(),
    slab_type: permissiveString,
    beam_number: permissiveInt,
    slab_number: permissiveInt,
    masonry: masonryElementSchema,
  }).catchall(z.unknown());

  const raftFoundationDataSchema = z.object({
    unit_id: permissiveString,
    raft_area: permissiveNumber,
    raft_thickness: permissiveNumber,
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
  }).catchall(z.unknown());

  const pilesFoundationDataSchema = z.object({
    unit_id: permissiveString,
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
  }).catchall(z.unknown());

  const raftPilesFoundationDataSchema = z.object({
    unit_id: permissiveString,
    raft_area: permissiveNumber,
    raft_thickness: permissiveNumber,
    concrete: z.array(z.unknown()).optional().nullable(),
    steel: z.array(z.unknown()).optional().nullable(),
  }).catchall(z.unknown());

  const wrapper = z.object({
    type: z.union([
      z.literal("beam_column"),
      z.literal("concrete_wall"),
      z.literal("structural_masonry"),
      z.literal("raft_foundation"),
      z.literal("piles_foundation"),
      z.literal("raft_piles_foundation"),
      z.string(),
    ]).optional(),
    data: z.union([
      beamColumnDataSchema,
      concreteWallDataSchema,
      structuralMasonryDataSchema,
      raftFoundationDataSchema,
      pilesFoundationDataSchema,
      raftPilesFoundationDataSchema,
      permissiveRecord,
      z.undefined(),
      z.null(),
    ]).optional().nullable(),
  }).catchall(z.unknown());

  return wrapper;
}

export type ModuleV2FormSchema = z.infer<
  ReturnType<typeof createModuleV2FormSchema>
>;
export type ModuleV2FormInput = z.input<
  ReturnType<typeof createModuleV2FormSchema>
>;

export const moduleFormSchema = createModuleV2FormSchema();

export {
  permissiveRecord,
  steelMaterialItemSchema,
  concreteVolumeItemSchema,
  formAreaItemSchema,
  masonryElementSchema,
  permissiveString,
  permissiveNumber,
  permissiveInt,
  z as validatorZod,
};
