import { masks } from "@/utils/masks";
import { useTranslation } from "@/i18n";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../../ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { RequiredAsterisk } from "./required-indicators";

type MaterialKey = "rebar" | "mesh" | "strand" | "other";

const defaultResistanceByMaterial: Record<string, string> = {
  rebar: "CA50",
  mesh: "CA60",
  strand: "CP190",
  other: "CA50",
};

interface SteelMaterialListProps {
  form: UseFormReturn<any>;
  name: string;
  allowedMaterials?: MaterialKey[];
  minItems?: number;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  isRequiredPosition?: boolean;
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

  return (
    <div
      key={fieldId}
      className="border border-gray-200 rounded-md p-3 space-y-3"
    >
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4">
          <FormField
            control={form.control}
            name={`${name}.${index}.material`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">
                  {t.modules.form.material}
                  <RequiredAsterisk />
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

        <div className="col-span-3">
          <FormField
            control={form.control}
            name={`${name}.${index}.resistance`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">
                  {t.modules.form.steelType}
                  <RequiredAsterisk />
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

        <div className="col-span-4">
          <FormField
            control={form.control}
            name={`${name}.${index}.mass`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">
                  {t.modules.form.massSteelKg}
                  <RequiredAsterisk />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 w-full"
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
        </div>

        <div className="col-span-1 flex items-end pb-[2px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            className="w-full h-9"
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
                <RequiredAsterisk />
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
                <RequiredAsterisk />
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  placeholder="Ex: 500"
                  onChange={(e) => field.onChange(Number(e.target.value))}
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
  allowedMaterials = ["rebar", "other"],
  minItems = 1,
  stepperMode = false,
  isSubmitted = false,
  isRequiredPosition = false,
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
    const numericValue =
      typeof item.mass === "string"
        ? parseFloat(item.mass.replace(/\./g, "").replace(",", "."))
        : item.mass;
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);

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

  const totalNonZero = (steelArray || []).reduce((count: number, item: any) => {
    if (!item?.mass) return count;
    const numericValue =
      typeof item.mass === "string"
        ? parseFloat(item.mass.replace(/\./g, "").replace(",", "."))
        : item.mass;
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
          {t.modules.form.steelMaterials}
          {isRequiredPosition ? <RequiredAsterisk /> : null}
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
            canRemove={
              !(isRequiredPosition && fields.length <= 1) &&
              fields.length > minItems
            }
          />
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const allowedResistancesByMaterial: Record<string, string[]> = {
            rebar: ["CA50", "CA60", "other"],
            mesh: ["CA60", "other"],
            strand: ["CP190", "other"],
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
