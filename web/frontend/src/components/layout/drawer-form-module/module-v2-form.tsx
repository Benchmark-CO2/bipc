import { useTranslation } from "@/i18n";
import { useModuleV2Form } from "@/hooks/useModuleV2Form";
import { parseNumber } from "@/utils/numbers";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericStringInput } from "@/components/ui/numeric-string-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { TTowerFloorCategory } from "@/types/units";
import { cn } from "@/lib/utils";
import MasonrySection from "./masonry-section";
import {
  SCALAR_FIELDS_BY_TYPE,
  type TScalarFieldDef,
} from "@/utils/modulePositions";
import { TAnyPosition, TModulesTypes } from "@/types/modules";
import type { UseFormReturn } from "react-hook-form";
import { masks } from "@/utils/masks";

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
  unitId?: string | null;
  floors?: TTowerFloorCategory[];
  isEdit?: boolean;
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
  if (!pos || pos === "unspecified") return t.modules.form.general;
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
  } = hook;

  const positions = getPositionsFor("concrete");
  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  const volumes = useWatch({
    control: form.control as unknown as Control,
    name: "data.concrete" as never,
    defaultValue: [],
  }) as ConcreteItem[] | undefined;

  const concreteItems = volumes ?? [];

  const isFckCustom = (n: unknown): boolean => {
    if (typeof n === "string" && !isNaN(Number(n)) && isFinite(Number(n))) {
      return !FCK_OPTIONS.includes(Number(n));
    }
    if (typeof n === "number" && isFinite(n)) {
      return !FCK_OPTIONS.includes(n);
    }
    return false;
  };

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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.summary.concrete}
          </h3>
          {concreteItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t.modules.form.totalConcreteVolume}:
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalVolume.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {concreteItems.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.concrete}
            </p>
          )}

          {concreteArray.fields.map((_, index) => {
            const fieldKey = `data.concrete.${index}`;
            const vol = concreteItems[index];
            const currentCustom =
              customFckSelected[fieldKey] ??
              vol?.customFck ??
              isFckCustom(vol?.fck);

            return (
              <div
                key={(vol as { id?: string })?.id ?? index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.position` as never}
                    render={({ field }) => {
                      const currentPosition = field.value ?? "unspecified";
                      const isEmptyOrGeneral =
                        currentPosition === "unspecified" ||
                        currentPosition === "" ||
                        currentPosition === "geral" ||
                        currentPosition === "general";
                      const isInAllowed =
                        typeof currentPosition === "string" &&
                        positions.includes(currentPosition);
                      const invalid = !isEmptyOrGeneral && !isInAllowed;
                      const acceptedList = positions.join(", ");
                      const tooltipContent = invalid
                        ? t.modules.warnings.invalidPosition
                            .replace("{{position}}", String(currentPosition))
                            .replace("{{accepted}}", acceptedList)
                        : null;
                      return (
                        <FormItem className="col-span-12 sm:col-span-3">
                          <FormLabel className="text-xs">
                            {t.modules.form.positionLabel}
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value ?? "unspecified"}
                              onValueChange={(v) => field.onChange(v)}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full h-9",
                                  invalid ? "gap-1 pr-2" : "",
                                )}
                              >
                                <SelectValue
                                  placeholder={
                                    t.modules.form.positionPlaceholder
                                  }
                                />
                                {invalid && tooltipContent && (
                                  <SimpleTooltip
                                    side="top"
                                    content={tooltipContent}
                                    triggerAsChild
                                  >
                                    <span
                                      className="inline-flex items-center shrink-0 mr-0.5 ml-auto !text-amber-600 dark:!text-amber-400 [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400"
                                      role="img"
                                      aria-label={t.modules.warnings.invalidPositionShort
                                        .replace(
                                          "{{position}}",
                                          String(currentPosition),
                                        )
                                        .replace("{{accepted}}", acceptedList)}
                                    >
                                      <AlertTriangle size={14} />
                                    </span>
                                  </SimpleTooltip>
                                )}
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
                                {field.value &&
                                  field.value !== "unspecified" &&
                                  !positions.includes(field.value) && (
                                    <SelectItem
                                      value={String(field.value)}
                                      disabled
                                      className="text-xs"
                                    >
                                      {getPositionLabel(t, field.value)}
                                    </SelectItem>
                                  )}
                                <SelectItem
                                  value="unspecified"
                                  className="text-xs"
                                >
                                  {t.modules.form.general}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.fck` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-5">
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
                            <SelectTrigger className="w-full h-9">
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
                      <FormItem className="col-span-12 sm:col-span-3">
                        <FormLabel className="text-xs">
                          {t.modules.form.volume}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={4}
                            allowNegative={false}
                            className="h-9 w-full max-w-[160px]"
                            placeholder="100,00"
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
                          <NumericStringInput
                            {...field}
                            decimalPlaces={0}
                            allowNegative={false}
                            className="h-9"
                            placeholder="70"
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
  firstPosition: _firstPosition,
  onRemove,
  canRemove,
  allowedMaterials: _allowedMaterials,
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
    rebar: ["CA50", "CA60", "CP190", "other"],
    mesh: ["CA60", "CP190", "other"],
    strand: ["CP190", "other"],
    general: ["CA50", "CA60", "CP190", "other"],
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
                  value={field.value ?? "unspecified"}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos} className="text-xs">
                        {getPositionLabel(t, pos)}
                      </SelectItem>
                    ))}
                    <SelectItem value="unspecified" className="text-xs">
                      {t.modules.form.general}
                    </SelectItem>
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
            <FormItem className="col-span-12 sm:col-span-3">
              <FormLabel className="text-xs">
                {t.modules.form.material}
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 w-full">
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
            <FormItem className="col-span-12 sm:col-span-3">
              <FormLabel className="text-xs">
                {t.modules.form.steelType}
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-9 w-full">
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
            <FormItem className="col-span-12 sm:col-span-3">
              <FormLabel className="text-xs">
                {t.modules.form.massSteelKg}
              </FormLabel>
              <FormControl>
                <NumericStringInput
                  {...field}
                  decimalPlaces={3}
                  allowNegative={false}
                  className="h-9 w-full max-w-[160px] text-xs"
                  placeholder="0,000"
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
                    className="h-9"
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
                  <NumericStringInput
                    {...field}
                    decimalPlaces={1}
                    allowNegative={false}
                    className="h-9"
                    placeholder="Ex: 500"
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

  const allowedMaterials: readonly (
    | "rebar"
    | "mesh"
    | "strand"
    | "general"
    | "other"
  )[] = ["rebar", "strand", "mesh", "general", "other"];

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
        general: "Geral",
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
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.steel}
            </p>
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
              canRemove={true}
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
  const { form, formArray, addFormItem, removeFormItem, getPositionsFor } =
    hook;

  const positions = getPositionsFor("form");
  if (positions.length === 0) return null;

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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.formAreaOptional}
          </h3>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t.modules.form.totalForm}:
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalArea.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m²
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.forms}
            </p>
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
                    render={({ field }) => {
                      const currentPosition = field.value ?? "unspecified";
                      const isEmptyOrGeneral =
                        currentPosition === "unspecified" ||
                        currentPosition === "" ||
                        currentPosition === "geral" ||
                        currentPosition === "general";
                      const isInAllowed =
                        typeof currentPosition === "string" &&
                        positions.includes(currentPosition);
                      const invalid = !isEmptyOrGeneral && !isInAllowed;
                      const acceptedList = positions.join(", ");
                      const tooltipContent = invalid
                        ? t.modules.warnings.invalidPosition
                            .replace("{{position}}", String(currentPosition))
                            .replace("{{accepted}}", acceptedList)
                        : null;
                      return (
                        <FormItem className="col-span-12 sm:col-span-8">
                          <FormLabel className="text-xs">
                            {t.modules.form.positionLabel}
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={field.value ?? "unspecified"}
                              onValueChange={(v) => field.onChange(v)}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full h-9",
                                  invalid ? "gap-1 pr-2" : "",
                                )}
                              >
                                <SelectValue
                                  placeholder={
                                    t.modules.form.positionPlaceholder
                                  }
                                />
                                {invalid && tooltipContent && (
                                  <SimpleTooltip
                                    side="top"
                                    content={tooltipContent}
                                    triggerAsChild
                                  >
                                    <span
                                      className="inline-flex items-center shrink-0 mr-0.5 ml-auto !text-amber-600 dark:!text-amber-400 [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400"
                                      role="img"
                                      aria-label={t.modules.warnings.invalidPositionShort
                                        .replace(
                                          "{{position}}",
                                          String(currentPosition),
                                        )
                                        .replace("{{accepted}}", acceptedList)}
                                    >
                                      <AlertTriangle size={14} />
                                    </span>
                                  </SimpleTooltip>
                                )}
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
                                {field.value &&
                                  field.value !== "unspecified" &&
                                  !positions.includes(field.value) && (
                                    <SelectItem
                                      value={String(field.value)}
                                      disabled
                                      className="text-xs"
                                    >
                                      {getPositionLabel(t, field.value)}
                                    </SelectItem>
                                  )}
                                <SelectItem
                                  value="unspecified"
                                  className="text-xs"
                                >
                                  {t.modules.form.general}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control as Control<any>}
                    name={`${fieldKey}.area` as never}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-3">
                        <FormLabel className="text-xs">
                          {t.modules.form.area}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-9 w-full max-w-[160px]"
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
        </div>
      </CardContent>
    </Card>
  );
};

const ScalarFieldsSection = ({
  hook,
  unitId,
  floors = [],
  isEdit = false,
}: {
  hook: ReturnType<typeof useModuleV2Form>;
  unitId?: string | null;
  floors?: TTowerFloorCategory[];
  isEdit?: boolean;
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

  const avgSlabAreaNumeric = useMemo(() => {
    if (!floors || floors.length === 0) return null;
    const total = floors.reduce(
      (sum, f) => sum + parseNumber(String(f.area ?? 0)),
      0,
    );
    return total / floors.length;
  }, [floors]);

  const canUseSlabAreaAvg = useMemo(
    () => !isEdit && !!unitId && avgSlabAreaNumeric !== null,
    [isEdit, unitId, avgSlabAreaNumeric],
  );

  const [useSlabAreaAvg, setUseSlabAreaAvg] = useState(false);
  const lastAppliedAvgRef = useRef<number | null>(null);

  const currentSlabAreaValue = useWatch({
    control: form.control,
    name: "data.slab_area" as never,
  }) as string | number | undefined;

  const setSlabAreaValue = useCallback(
    (next: string | number) => {
      form.setValue("data.slab_area" as never, next as never, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [form],
  );

  useEffect(() => {
    if (!canUseSlabAreaAvg) {
      setUseSlabAreaAvg(false);
      lastAppliedAvgRef.current = null;
    }
  }, [canUseSlabAreaAvg]);

  useEffect(() => {
    if (!useSlabAreaAvg || avgSlabAreaNumeric === null) return;
    const currentNum = parseNumber(String(currentSlabAreaValue ?? 0));
    const applied = lastAppliedAvgRef.current;
    if (applied === null) return;
    if (Math.abs(currentNum - applied) > 0.001) {
      setUseSlabAreaAvg(false);
      lastAppliedAvgRef.current = null;
    }
  }, [currentSlabAreaValue, useSlabAreaAvg, avgSlabAreaNumeric]);

  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((def) => {
        const label = getScalarLabel(t, def.key);
        const fieldName = `data.${def.key}` as const;
        const fullWidth = getScalarGridClass(type, def) === "col-span-1";

        const isSlabArea = def.key === "slab_area";
        const showSlabAreaCheckbox = isSlabArea && canUseSlabAreaAvg;

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
                      <SelectTrigger className="h-9 w-full">
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
            render={({ field }) => {
              const isInteger = /_number$/.test(def.key);
              const decimals = isInteger ? 0 : 2;

              if (showSlabAreaCheckbox) {
                const handleCheckboxChange = (checked: boolean) => {
                  setUseSlabAreaAvg(checked);
                  if (checked && avgSlabAreaNumeric !== null) {
                    const rounded = Number(avgSlabAreaNumeric.toFixed(2));
                    lastAppliedAvgRef.current = rounded;
                    setSlabAreaValue(String(rounded));
                  } else {
                    lastAppliedAvgRef.current = null;
                  }
                };

                return (
                  <FormItem className={fullWidth ? "sm:col-span-2" : ""}>
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-xs mb-0">{label}</FormLabel>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <Checkbox
                          id={`avg-slab-area-${type}`}
                          checked={useSlabAreaAvg}
                          onCheckedChange={(v) =>
                            handleCheckboxChange(Boolean(v))
                          }
                          className="h-3.5 w-3.5"
                        />
                        <label
                          htmlFor={`avg-slab-area-${type}`}
                          className="text-[11px] text-muted-foreground cursor-pointer select-none leading-none"
                        >
                          {t.modules.form.useSlabAreaAvg}
                        </label>
                      </div>
                    </div>
                    <FormControl>
                      <NumericStringInput
                        {...field}
                        decimalPlaces={decimals}
                        allowNegative={false}
                        forceDecimalPlaces={!isInteger}
                        className="h-9 mt-1"
                        placeholder={def.placeholder ?? "0"}
                      />
                    </FormControl>
                  </FormItem>
                );
              }

              return (
                <FormItem className={fullWidth ? "sm:col-span-2" : ""}>
                  <FormLabel className="text-xs">{label}</FormLabel>
                  <FormControl>
                    <NumericStringInput
                      {...field}
                      decimalPlaces={decimals}
                      allowNegative={false}
                      forceDecimalPlaces={!isInteger}
                      className="h-9"
                      placeholder={def.placeholder ?? "0"}
                    />
                  </FormControl>
                </FormItem>
              );
            }}
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
    masonryBlocksArray,
    masonryMortarArray,
    masonryGroutArray,
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
      masonryBlocksArray={masonryBlocksArray}
      masonryMortarArray={masonryMortarArray}
      masonryGroutArray={masonryGroutArray}
    />
  );
};

const ModuleV2Form = ({
  hook,
  stepperMode,
  isSubmitted,
  unitId,
  floors,
  isEdit,
}: ModuleV2FormProps) => {
  const { t } = useTranslation();
  const { type } = hook;

  const sections = SECTION_BY_TYPE[type] ?? SECTION_BY_TYPE.beam_column;
  void isSubmitted;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.technologyData}
        </h3>
      </div>

      {sections.scalar && (
        <ScalarFieldsSection
          hook={hook}
          unitId={unitId}
          floors={floors}
          isEdit={isEdit}
        />
      )}

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
