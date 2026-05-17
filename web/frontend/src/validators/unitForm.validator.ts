import { Translations } from "@/i18n/translations/pt-BR";
import { parseNumber } from "@/utils/numbers";
import { z } from "zod";

const baseUnitSchema = (t: Translations) =>
  z.object({
    name: z.string().min(3, t.validators.nameMinLength),
    type: z.enum(["tower"], {
      required_error: t.validators.selectUnitType,
      invalid_type_error: t.validators.invalidUnitType,
    }),
    repetition_count: z
      .number()
      .int()
      .positive(t.validators.repetitionPositive)
      .optional(),
    housing_units_count: z
      .number()
      .int()
      .positive(t.validators.housingUnitsPositive)
      .optional(),
  });

export const floorFormSchema = (t: Translations) =>
  z.object({
    id: z.string().uuid().optional(),
    floor_group: z.string().min(1, t.validators.floorGroupRequired),
    area: z.string().min(1, t.validators.areaRequired),
    height: z.string().min(1, t.validators.heightRequired),
    category: z.enum(
      ["standard_floor", "ground_floor", "basement_floor", "penthouse_floor"],
      {
        required_error: t.validators.selectCategory,
        invalid_type_error: t.validators.invalidCategory,
      },
    ),
    index: z.number().int(),
    repetition: z
      .number()
      .int()
      .positive(t.validators.quantityPositive)
      .optional(),
  });

export const floorSchema = (t: Translations) =>
  z.object({
    id: z.string().uuid().optional(),
    floor_group: z.string().min(1, t.validators.floorGroupRequired),
    area: z
      .string()
      .min(1, t.validators.areaRequired)
      .transform((val, ctx) => {
        const num = parseNumber(val);
        if (isNaN(num) || num <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.validators.areaGreaterThanZero,
          });
          return z.NEVER;
        }
        return num;
      }),
    height: z
      .string()
      .min(1, t.validators.heightRequired)
      .transform((val, ctx) => {
        const num = parseNumber(val);
        if (isNaN(num) || num <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.validators.heightGreaterThanZero,
          });
          return z.NEVER;
        }
        return num;
      }),
    category: z.enum(
      ["standard_floor", "ground_floor", "basement_floor", "penthouse_floor"],
      {
        required_error: t.validators.selectCategory,
        invalid_type_error: t.validators.invalidCategory,
      },
    ),
    index: z.number().int(),
  });

export type FloorFormInput = {
  id?: string;
  floor_group: string;
  area: string;
  height: string;
  category:
    | "standard_floor"
    | "ground_floor"
    | "basement_floor"
    | "penthouse_floor";
  index: number;
  repetition?: number;
};

export type FloorSchema = z.infer<ReturnType<typeof floorSchema>>;

const towerFieldsSchema = (t: Translations) =>
  z.object({
    data: z.object({
      floors: z
        .array(floorSchema(t))
        .min(1, t.validators.atLeastOneFloor),
    }),
  });

export function createUnitFormSchema(t: Translations) {
  return baseUnitSchema(t).merge(towerFieldsSchema(t));
}

export type UnitFormInput = {
  name: string;
  type: "tower";
  housing_units_count?: number;
  repetition_count?: number;
  data: {
    floors: FloorFormInput[];
  };
};

export type UnitFormSchema = z.infer<ReturnType<typeof createUnitFormSchema>>;

export function createAddUnitFormSchema(t: Translations) {
  return z.object({
    name: z.string().min(3, t.validators.nameMinLength),
  });
}

export type AddUnitFormSchema = z.infer<
  ReturnType<typeof createAddUnitFormSchema>
>;
