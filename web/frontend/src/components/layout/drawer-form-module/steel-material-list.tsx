import { useTranslation } from "@/i18n";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "../../ui/form";
import { Input } from "../../ui/input";
import { NumericStringInput } from "../../ui/numeric-string-input";
import { parseNumber } from "@/utils/numbers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { SimpleTooltip } from "../../ui/simple-tooltip";

type MaterialKey = "rebar" | "mesh" | "strand" | "general" | "other";

const defaultResistanceByMaterial: Record<string, string> = {
  rebar: "CA50",
  mesh: "CA60",
  strand: "CP190",
  general: "CA50",
  other: "CA50",
};

const POSITION_LABEL_KEY: Record<string, string> = {
  column: "Pilar",
  beam: "Viga",
  slab: "Laje",
  stair: "Escada",
  wall: "Parede",
  raft: "Radier",
  pile: "Estaca",
  block: "Bloco",
  grade_beam: "Viga de amarração",
  tie_beam: "Viga baldrame",
  vertical: "Vertical",
  horizontal: "Horizontal",
};

const getPositionLabel = (
  t: ReturnType<typeof useTranslation>["t"],
  pos: string | undefined,
): string => {
  if (!pos || pos === "unspecified") return t.modules.form.general;
  return POSITION_LABEL_KEY[pos] ?? pos;
};

interface SteelMaterialListProps {
  form: UseFormReturn<any>;
  name: string;
  allowedMaterials?: readonly MaterialKey[];
  minItems?: number;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  isRequiredPosition?: boolean;
  positions?: readonly string[];
  firstPosition?: string;
  titleLabel?: string;
  emptyLabel?: string;
}

interface SteelMaterialItemProps {
  form: UseFormReturn<any>;
  name: string;
  index: number;
  fieldId: string;
  materialOptions: Array<{ value: string; label: string }>;
  resistanceOptions: Array<{ value: string; label: string }>;
  otherCombinations: string[];
  onRemove: () => void;
  canRemove: boolean;
  positions?: readonly string[];
  firstPosition?: string;
}

const SteelMaterialItem = ({
  form,
  name,
  index,
  fieldId,
  materialOptions,
  resistanceOptions,
  otherCombinations,
  onRemove,
  canRemove,
  positions,
  firstPosition: _firstPosition,
}: SteelMaterialItemProps) => {
  const { t } = useTranslation();
  const currentMaterial = useWatch({
    control: form.control,
    name: `${name}.${index}.material`,
  });
  const currentResistance = useWatch({
    control: form.control,
    name: `${name}.${index}.resistance`,
  });

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

  const isCombinationUsed = (mat: string, res: string) => {
    if (mat === "other" && res === "other") return false;
    return otherCombinations.includes(`${mat}:${res}`);
  };

  useEffect(() => {
    if (currentResistance && !allowedResistances.includes(currentResistance)) {
      form.setValue(
        `${name}.${index}.resistance`,
        filteredResistanceOptions[0]?.value ?? "CA50",
      );
    }
  }, [currentMaterial]);

  const isOtherMaterial = currentMaterial === "other";
  const isOtherResistance = currentResistance === "other";

  const hasPositionField = Array.isArray(positions) && positions.length > 0;

  return (
    <div
      key={fieldId}
      className="border border-gray-200 rounded-md p-3 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        {hasPositionField && (
          <div className="col-span-12 sm:col-span-2 ">
            <FormField
              control={form.control}
              name={`${name}.${index}.position`}
              render={({ field }) => {
                const currentPosition = field.value ?? "unspecified";
                const isEmptyOrGeneral =
                  currentPosition === "unspecified" ||
                  currentPosition === "" ||
                  currentPosition === "geral" ||
                  currentPosition === "general";
                const isValid =
                  isEmptyOrGeneral ||
                  positions!.some(
                    (p) =>
                      p.toLowerCase().trim() ===
                      String(currentPosition).toLowerCase().trim(),
                  );
                const invalid = !isValid;
                const acceptedList = (positions ?? []).join(", ");
                const tooltipContent = invalid
                  ? t.modules.warnings.invalidPosition
                      .replace("{{position}}", String(currentPosition ?? ""))
                      .replace("{{accepted}}", acceptedList)
                  : null;
                return (
                  <FormItem className="w-full space-y-1">
                    <FormLabel className="text-xs">
                      {t.modules.form.positionLabel}
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={currentPosition}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 w-full",
                            invalid ? "gap-1 pr-2" : "",
                          )}
                        >
                          <SelectValue
                            placeholder={t.modules.form.positionPlaceholder}
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
                                    String(currentPosition ?? ""),
                                  )
                                  .replace("{{accepted}}", acceptedList)}
                              >
                                <AlertTriangle size={14} />
                              </span>
                            </SimpleTooltip>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {positions!.map((pos) => (
                            <SelectItem
                              key={pos}
                              value={pos}
                              className="text-xs"
                            >
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
                );
              }}
            />
          </div>
        )}

        <div
          className={
            hasPositionField
              ? "col-span-12 sm:col-span-2"
              : "col-span-12 sm:col-span-3"
          }
        >
          <FormField
            control={form.control}
            name={`${name}.${index}.material`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
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
                        const allCombinationsUsed =
                          opt.value !== "other" &&
                          matResistances.every((res) =>
                            isCombinationUsed(opt.value, res),
                          );
                        return (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={
                              allCombinationsUsed &&
                              currentMaterial !== opt.value
                            }
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
        </div>

        <div
          className={
            hasPositionField
              ? "col-span-12 sm:col-span-2"
              : "col-span-12 sm:col-span-3"
          }
        >
          <FormField
            control={form.control}
            name={`${name}.${index}.resistance`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
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
        </div>

        <div className="col-span-12 sm:col-span-4">
          <FormField
            control={form.control}
            name={`${name}.${index}.mass`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">
                  {t.modules.form.massSteelKg}
                </FormLabel>
                <FormControl>
                  <NumericStringInput
                    {...field}
                    decimalPlaces={3}
                    allowNegative={false}
                    className="h-9 w-full max-w-[160px]"
                    placeholder="0,000"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-12 sm:col-span-2 flex sm:items-end sm:pb-[2px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            className="w-full h-9 shrink-0"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

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
                <Input {...field} placeholder="Ex: Aço especial" />
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
                  placeholder="Ex: 500"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

const SteelMaterialList = ({
  form,
  name,
  allowedMaterials = ["rebar", "general", "other"],
  minItems = 0,
  stepperMode = false,
  isSubmitted = false,
  isRequiredPosition = false,
  positions,
  firstPosition,
  titleLabel,
  emptyLabel,
}: SteelMaterialListProps) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  const steelArray = useWatch({
    control: form.control,
    name,
  });

  const totalMass = (steelArray || []).reduce((sum: number, item: any) => {
    if (!item?.mass) return sum;
    const numericValue = parseNumber(item.mass);
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  const materialOptions = allowedMaterials.map((key) => ({
    value: key,
    label:
      {
        general: t.modules.form.general,
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

  const totalNonZero = (steelArray || []).reduce((count: number, item: any) => {
    if (!item?.mass) return count;
    const numericValue = parseNumber(item.mass);
    if (isNaN(numericValue) || numericValue <= 0) return count;
    return count + 1;
  }, 0);

  const isEmpty = isRequiredPosition && totalNonZero === 0;
  const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

  const wrapperBorder = shouldMarkError
    ? "border-red-500 ring-red-200"
    : "border-transparent";

  return (
    <div className={`space-y-3 p-3 rounded-md border-2 ${wrapperBorder}`}>
      <div className="flex items-center justify-between">
        <FormLabel className="text-xs text-gray-700">
          {titleLabel ?? t.modules.form.steelMaterials}
        </FormLabel>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Total:</span>
          <span className="text-sm font-semibold text-gray-900">
            {totalMass.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            kg
          </span>
        </div>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic px-1 py-1">
          {emptyLabel ?? t.modules.form.emptyList.steel}
        </p>
      )}

      {fields.map((field, index) => {
        const otherCombinations = (steelArray || [])
          .map((item: any, i: number) => {
            if (i === index || !item?.material || !item?.resistance)
              return null;
            return `${item.material}:${item.resistance}`;
          })
          .filter(Boolean) as string[];
        return (
          <SteelMaterialItem
            key={field.id}
            form={form}
            name={name}
            index={index}
            fieldId={field.id}
            materialOptions={materialOptions}
            resistanceOptions={resistanceOptions}
            otherCombinations={otherCombinations}
            onRemove={() => remove(index)}
            canRemove={fields.length > minItems}
            positions={positions}
            firstPosition={firstPosition}
          />
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const allowedResistancesByMaterial: Record<string, string[]> = {
            rebar: ["CA50", "CA60", "CP190", "other"],
            mesh: ["CA60", "CP190", "other"],
            strand: ["CP190", "other"],
            general: ["CA50", "CA60", "CP190", "other"],
            other: ["CA50", "CA60", "CP190", "other"],
          };

          const currentCombinations = (steelArray || [])
            .filter((item: any) => item?.material && item?.resistance)
            .map((item: any) => `${item.material}:${item.resistance}`);

          let foundMaterial = allowedMaterials[0] ?? "rebar";
          let foundResistance =
            defaultResistanceByMaterial[foundMaterial] ?? "CA50";

          outer: for (const mat of allowedMaterials) {
            const resistances = allowedResistancesByMaterial[mat] ?? ["CA50"];
            for (const res of resistances) {
              if (mat === "other" && res === "other") {
                foundMaterial = mat;
                foundResistance = res;
                break outer;
              }
              if (!currentCombinations.includes(`${mat}:${res}`)) {
                foundMaterial = mat;
                foundResistance = res;
                break outer;
              }
            }
          }

          append({
            material: foundMaterial,
            resistance: foundResistance,
            mass: "0",
            position: "unspecified",
          });
        }}
        className="w-full text-green-600 border-green-600 hover:bg-green-50"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SteelMaterialList;
