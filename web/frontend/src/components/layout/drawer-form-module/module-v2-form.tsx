import { useTranslation } from "@/i18n";
import { useModuleV2Form } from "@/hooks/useModuleV2Form";
import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MasonrySection from "./masonry-section";
import {
  SCALAR_FIELDS_BY_TYPE,
  type TScalarFieldDef,
} from "@/utils/modulePositions";
import { TAnyPosition, TModulesTypes } from "@/types/modules";
import type { UseFormReturn } from "react-hook-form";

type ConcreteItem = {
  fck: number | string | "";
  volume: string | number;
  position?: TAnyPosition;
  customFck?: boolean;
};

type SteelItem = {
  material: string;
  other_name?: string;
  resistance: string;
  other_resistance?: number;
  mass: string | number;
  position?: TAnyPosition;
};

type FormItemArea = {
  area: string | number;
  position?: TAnyPosition;
};

type ModuleV2FormProps = {
  hook: ReturnType<typeof useModuleV2Form>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
};

const FCK_OPTIONS: readonly number[] = [20, 25, 30, 35, 40, 45, 50];

const POSITION_LABEL_KEY: Record<
  string,
  keyof ReturnType<
    typeof useTranslation
  >["t"]["modules"]["form"]["completeness"]["positions"]
> = {
  column: "column",
  beam: "beam",
  slab: "slab",
  stair: "stair",
  wall: "wall",
  raft: "raft",
  pile: "pile",
  block: "block",
  grade_beam: "grade_beam",
  tie_beam: "tie_beam",
  vertical: "column",
  horizontal: "beam",
};

const SLAB_TYPE_FULL_WIDTH_TYPES: readonly TModulesTypes[] = [
  "beam_column",
  "concrete_wall",
  "structural_masonry",
];

const getPositionLabel = (
  t: ReturnType<typeof useTranslation>["t"],
  pos: string | undefined,
): string => {
  if (!pos) return t.modules.form.unspecifiedPosition;
  const key = POSITION_LABEL_KEY[pos];
  if (key) return t.modules.form.completeness.positions[key] ?? pos;
  return pos;
};

const getScalarLabel = (
  t: ReturnType<typeof useTranslation>["t"],
  key: string,
): string => {
  const map: Record<
    string,
    keyof ReturnType<typeof useTranslation>["t"]["modules"]["form"]
  > = {
    slab_type: "slabTypeOptional",
    column_number: "columnCount",
    beam_number: "beamCount",
    slab_number: "slabCount",
    avg_beam_span: "avgBeamSpan",
    avg_slab_span: "avgSlabSpan",
    wall_thickness: "wallThickness",
    slab_thickness: "slabThickness",
    wall_area: "wallArea",
    slab_area: "slabArea",
    raft_area: "raftArea",
    raft_thickness: "raftThickness",
  };
  const mapKey = map[key];
  if (!mapKey) return key;
  return (t.modules.form[mapKey] as string) ?? key;
};

const FIRST_POSITION: Record<TModulesTypes, string> = {
  beam_column: "column",
  concrete_wall: "wall",
  structural_masonry: "column",
  raft_foundation: "raft",
  piles_foundation: "pile",
  raft_piles_foundation: "raft",
};

const SECTION_BY_TYPE: Record<
  TModulesTypes,
  {
    concrete: boolean;
    steel: boolean;
    form: boolean;
    scalar: boolean;
    masonry: boolean;
  }
> = {
  beam_column: {
    concrete: true,
    steel: true,
    form: true,
    scalar: true,
    masonry: false,
  },
  concrete_wall: {
    concrete: true,
    steel: true,
    form: true,
    scalar: true,
    masonry: false,
  },
  structural_masonry: {
    concrete: true,
    steel: true,
    form: true,
    scalar: true,
    masonry: true,
  },
  raft_foundation: {
    concrete: true,
    steel: true,
    form: false,
    scalar: false,
    masonry: false,
  },
  piles_foundation: {
    concrete: true,
    steel: true,
    form: false,
    scalar: false,
    masonry: false,
  },
  raft_piles_foundation: {
    concrete: true,
    steel: true,
    form: false,
    scalar: false,
    masonry: false,
  },
};

const getScalarGridClass = (type: TModulesTypes, def: TScalarFieldDef) => {
  if (def.key === "slab_type" && SLAB_TYPE_FULL_WIDTH_TYPES.includes(type)) {
    return "col-span-1";
  }
  return "col-span-1 sm:col-span-2";
};

const ConcreteListSection = ({
  hook,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
}) => {
  const { t } = useTranslation();
  const {
    form,
    concreteArray,
    addConcreteItem,
    removeConcreteItem,
    getPositionsFor,
    type,
  } = hook;

  const positions = getPositionsFor("concrete");
  const firstPosition = positions[0] ?? FIRST_POSITION[type] ?? "column";
  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  const volumes = useWatch({
    control: form.control as unknown as Control,
    name: "data.concrete" as never,
    defaultValue: [],
  }) as ConcreteItem[] | undefined;

  const concreteItems = volumes ?? [];

  const totalVolume = useMemo(
    () =>
      concreteItems.reduce(
        (sum, v) => sum + parseNumber(String(v.volume || "0")),
        0,
      ),
    [concreteItems],
  );

  const handleSelectFck = (index: number, rawValue: string) => {
    const fieldKey = `data.concrete.${index}`;
    if (rawValue === "other") {
      setCustomFckSelected((prev) => ({ ...prev, [fieldKey]: true }));
      form.setValue(`${fieldKey}.customFck` as never, true as never);
      const currentFck = Number(
        form.getValues(`${fieldKey}.fck` as never) ?? 0,
      );
      if (!currentFck || FCK_OPTIONS.includes(currentFck)) {
        form.setValue(`${fieldKey}.fck` as never, 70 as never);
      }
      return;
    }
    const n = Number(rawValue);
    setCustomFckSelected((prev) => ({ ...prev, [fieldKey]: false }));
    form.setValue(`${fieldKey}.fck` as never, n as never);
    form.setValue(`${fieldKey}.customFck` as never, false as never);
  };

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.summary.concrete}
          </h3>
        </div>

        <div className="space-y-2">
          {concreteItems.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
          )}

          {concreteArray.fields.map((_, index) => {
            const fieldKey = `data.concrete.${index}`;
            const vol = concreteItems[index];
            const currentCustom =
              customFckSelected[fieldKey] ?? vol?.customFck ?? false;

            return (
              <div
                key={(vol as { id?: string })?.id ?? index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.position` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-3">
                        <FormLabel className="text-xs">Posição</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? firstPosition}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Selecione a posição" />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map((pos) => (
                                <SelectItem
                                  key={pos}
                                  value={pos}
                                  className="text-xs"
                                >
                                  {getPositionLabel(t, pos)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.fck` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">
                          {t.modules.form.fckLabel}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              currentCustom
                                ? "other"
                                : String(field.value ?? "")
                            }
                            onValueChange={(val) => handleSelectFck(index, val)}
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue
                                placeholder={t.modules.form.selectFck}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {FCK_OPTIONS.map((fck) => (
                                <SelectItem
                                  key={fck}
                                  value={String(fck)}
                                  className="text-xs"
                                >
                                  {fck}
                                </SelectItem>
                              ))}
                              <SelectItem value="other" className="text-xs">
                                {t.modules.form.other}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.volume` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">
                          {t.modules.form.volume}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-9 text-xs"
                            placeholder="100"
                            value={field.value || ""}
                            onChange={(e) => {
                              const newValue = masks.numeric(e.target.value);
                              field.onChange(newValue);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeConcreteItem(index)}
                      disabled={concreteItems.length <= 0}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {currentCustom && (
                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.fck` as never}
                    render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel className="text-xs">
                          {t.modules.form.otherFck}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="h-9 text-xs"
                            placeholder="70"
                            value={
                              typeof field.value === "number"
                                ? field.value
                                : (field.value ?? "")
                            }
                            onChange={(e) => {
                              field.onChange(Number(e.target.value));
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addConcreteItem()}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {concreteItems.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t.modules.form.totalConcreteVolume}:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalVolume.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SteelMaterialItemInline = ({
  form,
  name,
  index,
  positions,
  firstPosition,
  onRemove,
  canRemove,
  allowedMaterials,
  materialOptions,
  resistanceOptions,
}: {
  form: UseFormReturn<any>;
  name: string;
  index: number;
  positions: readonly string[];
  firstPosition: string;
  onRemove: () => void;
  canRemove: boolean;
  allowedMaterials: readonly string[];
  materialOptions: Array<{ value: string; label: string }>;
  resistanceOptions: Array<{ value: string; label: string }>;
}) => {
  const { t } = useTranslation();
  const currentMaterial = useWatch({
    control: form.control,
    name: `${name}.${index}.material`,
  });
  const currentResistance = useWatch({
    control: form.control,
    name: `${name}.${index}.resistance`,
  });
  const steelArr = (useWatch({
    control: form.control,
    name,
    defaultValue: [],
  }) ?? []) as SteelItem[];

  const allowedResistancesByMaterial: Record<string, string[]> = {
    rebar: ["CA50", "CA60", "other"],
    mesh: ["CA60", "other"],
    strand: ["CP190", "other"],
    other: ["CA50", "CA60", "CP190", "other"],
  };
  const allowedResistances =
    allowedResistancesByMaterial[currentMaterial] ??
    resistanceOptions.map((o) => o.value);
  const filteredResistanceOptions = resistanceOptions.filter((opt) =>
    allowedResistances.includes(opt.value),
  );

  const otherCombinations = steelArr
    .map((item, i) => {
      if (i === index || !item?.material || !item?.resistance) return null;
      return `${item.material}:${item.resistance}`;
    })
    .filter(Boolean) as string[];

  const isCombinationUsed = (mat: string, res: string) => {
    if (mat === "other" && res === "other") return false;
    return otherCombinations.includes(`${mat}:${res}`);
  };

  const isOtherMaterial = currentMaterial === "other";
  const isOtherResistance = currentResistance === "other";

  return (
    <div className="space-y-3 bg-white rounded-md border p-3">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <FormField
          control={form.control}
          name={`${name}.${index}.position`}
          render={({ field }) => (
            <FormItem className="col-span-12 sm:col-span-2">
              <FormLabel className="text-xs">Posição</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? firstPosition}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos} className="text-xs">
                        {getPositionLabel(t, pos)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${name}.${index}.material`}
          render={({ field }) => (
            <FormItem className="col-span-12 sm:col-span-2">
              <FormLabel className="text-xs">
                {t.modules.form.material}
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {materialOptions.map((opt) => {
                      const matResistances =
                        allowedResistancesByMaterial[opt.value] ??
                        resistanceOptions.map((r) => r.value);
                      const allUsed =
                        opt.value !== "other" &&
                        matResistances.every((res) =>
                          isCombinationUsed(opt.value, res),
                        );
                      return (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={allUsed && currentMaterial !== opt.value}
                        >
                          {opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${name}.${index}.resistance`}
          render={({ field }) => (
            <FormItem className="col-span-12 sm:col-span-2">
              <FormLabel className="text-xs">
                {t.modules.form.steelType}
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredResistanceOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={
                          isCombinationUsed(currentMaterial, opt.value) &&
                          currentResistance !== opt.value
                        }
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${name}.${index}.mass`}
          render={({ field }) => (
            <FormItem className="col-span-12 sm:col-span-5">
              <FormLabel className="text-xs">
                {t.modules.form.massSteelKg}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-9 w-full text-xs"
                  placeholder="0,00"
                  onChange={(e) => {
                    const maskedValue = masks.numeric(e.target.value);
                    field.onChange(maskedValue);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            className="h-9 w-9 p-0 shrink-0"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isOtherMaterial && (
          <FormField
            control={form.control}
            name={`${name}.${index}.other_name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  {t.modules.form.customMaterialName}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 text-xs"
                    placeholder="Ex: Aço especial"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {isOtherResistance && (
          <FormField
            control={form.control}
            name={`${name}.${index}.other_resistance`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  {t.modules.form.customResistance}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="h-9 text-xs"
                    placeholder="Ex: 500"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
};

const SteelSection = ({
  hook,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
}) => {
  const { t } = useTranslation();
  const {
    form,
    steelArray,
    addSteelItem,
    removeSteelItem,
    getPositionsFor,
    type,
  } = hook;

  const positions = getPositionsFor("steel");
  if (positions.length === 0) return null;
  const firstPosition = positions[0] ?? FIRST_POSITION[type] ?? "column";

  const allowedMaterials: readonly ("rebar" | "mesh" | "strand" | "other")[] = [
    "rebar",
    "strand",
    "mesh",
    "other",
  ];

  const steelItems = (useWatch({
    control: form.control as unknown as Control,
    name: "data.steel" as never,
    defaultValue: [],
  }) ?? []) as SteelItem[];

  const totalMass = useMemo(
    () =>
      steelItems.reduce((sum: number, item: SteelItem) => {
        if (!item?.mass) return sum;
        const numericValue =
          typeof item.mass === "string"
            ? parseFloat(item.mass.replace(/\./g, "").replace(",", "."))
            : item.mass;
        return sum + (isNaN(numericValue) ? 0 : numericValue);
      }, 0),
    [steelItems],
  );

  const materialOptions = allowedMaterials.map((key) => ({
    value: key,
    label:
      {
        rebar: t.modules.form.rebar,
        mesh: t.modules.form.mesh,
        strand: t.modules.form.strand,
        other: t.modules.form.other,
      }[key] ?? key,
  }));

  const resistanceOptions = [
    { value: "CA50", label: "CA-50" },
    { value: "CA60", label: "CA-60" },
    { value: "CP190", label: "CP-190" },
    { value: "other", label: t.modules.form.other },
  ];

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.steelMaterials}
          </h3>
          {steelItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalMass.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                kg
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {steelItems.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
          )}

          {steelArray.fields.map((field, index) => (
            <SteelMaterialItemInline
              key={field.id}
              form={form as UseFormReturn<any>}
              name="data.steel"
              index={index}
              positions={positions}
              firstPosition={firstPosition}
              onRemove={() => removeSteelItem(index)}
              canRemove={steelItems.length > 1}
              allowedMaterials={allowedMaterials}
              materialOptions={materialOptions}
              resistanceOptions={resistanceOptions}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addSteelItem()}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FormAreaSection = ({
  hook,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
}) => {
  const { t } = useTranslation();
  const {
    form,
    formArray,
    addFormItem,
    removeFormItem,
    getPositionsFor,
    type,
  } = hook;

  const positions = getPositionsFor("form");
  if (positions.length === 0) return null;
  const firstPosition = positions[0] ?? FIRST_POSITION[type] ?? "column";

  const areaItems = useWatch({
    control: form.control as unknown as Control,
    name: "data.form" as never,
    defaultValue: [],
  }) as FormItemArea[] | undefined;

  const items = areaItems ?? [];

  const totalArea = useMemo(
    () => items.reduce((sum, v) => sum + parseNumber(String(v.area || "0")), 0),
    [items],
  );

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.formAreaOptional}
          </h3>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
          )}

          {formArray.fields.map((_, index) => {
            const fieldKey = `data.form.${index}`;
            return (
              <div
                key={(items[index] as { id?: string })?.id ?? index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.position` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-5">
                        <FormLabel className="text-xs">Posição</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? firstPosition}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Selecione a posição" />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map((pos) => (
                                <SelectItem
                                  key={pos}
                                  value={pos}
                                  className="text-xs"
                                >
                                  {getPositionLabel(t, pos)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.area` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-6">
                        <FormLabel className="text-xs">
                          {t.modules.form.area}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-9 text-xs"
                            placeholder="0,00"
                            value={field.value || ""}
                            onChange={(e) => {
                              const newValue = masks.numeric(e.target.value);
                              field.onChange(newValue);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFormItem(index)}
                      disabled={items.length <= 0}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addFormItem()}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {items.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t.modules.form.totalForm}:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalArea.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m²
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ScalarFieldsSection = ({
  hook,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
}) => {
  const { t } = useTranslation();
  const { form, type } = hook;
  const slabTypeOptions = useTranslation().t.modules.form.slabTypes;
  const slabOptArr = Object.entries(slabTypeOptions).map(([value, label]) => ({
    value,
    label: label as string,
  }));
  const fields = (SCALAR_FIELDS_BY_TYPE[type] ??
    []) as readonly TScalarFieldDef[];

  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((def) => {
        const label = getScalarLabel(t, def.key);
        const fieldName = `data.${def.key}` as const;
        const fullWidth = getScalarGridClass(type, def) === "col-span-1";

        if (def.kind === "select") {
          return (
            <FormField
              key={def.key}
              control={form.control as Control<any>}
              name={fieldName as never}
              render={({ field }) => (
                <FormItem className={fullWidth ? "sm:col-span-2" : ""}>
                  <FormLabel className="text-xs">{label}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue
                          placeholder={t.modules.form.selectSlabType}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {slabOptArr.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          );
        }

        return (
          <FormField
            key={def.key}
            control={form.control as Control<any>}
            name={fieldName as never}
            render={({ field }) => (
              <FormItem className={fullWidth ? "sm:col-span-2" : ""}>
                <FormLabel className="text-xs">{label}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="h-9 text-xs"
                    placeholder={def.placeholder ?? "0"}
                    value={field.value === 0 ? "" : (field.value ?? "")}
                    onChange={(e) => {
                      const newValue = masks.numeric(e.target.value);
                      field.onChange(newValue);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );
      })}
    </div>
  );
};

const MasonrySectionWrapper = ({
  hook,
  stepperMode,
  isSubmitted,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
}) => {
  const {
    form,
    addMasonryBlock,
    removeMasonryBlock,
    addMasonryMortar,
    removeMasonryMortar,
    addMasonryGrout,
    removeMasonryGrout,
  } = hook;

  return (
    <MasonrySection
      form={form as UseFormReturn<any>}
      hooks={{
        addMasonryBlock,
        removeMasonryBlock,
        addMasonryMortar,
        removeMasonryMortar,
        addMasonryGrout,
        removeMasonryGrout,
      }}
      stepperMode={stepperMode}
      isSubmitted={isSubmitted}
    />
  );
};

const ModuleV2Form = ({
  hook,
  stepperMode,
  isSubmitted,
}: ModuleV2FormProps) => {
  const { t } = useTranslation();
  const { type } = hook;

  const sections = SECTION_BY_TYPE[type] ?? SECTION_BY_TYPE.beam_column;
  const _ = isSubmitted;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.technologyData}
        </h3>
      </div>

      {sections.scalar && <ScalarFieldsSection hook={hook} />}

      {sections.concrete && <ConcreteListSection hook={hook} />}

      {sections.steel && <SteelSection hook={hook} />}

      {sections.form && <FormAreaSection hook={hook} />}

      {sections.masonry && type === "structural_masonry" && (
        <MasonrySectionWrapper
          hook={hook}
          stepperMode={stepperMode}
          isSubmitted={false}
        />
      )}
    </div>
  );
};

export default ModuleV2Form;
