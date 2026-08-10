import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { useTranslation } from "@/i18n";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import SteelMaterialList from "./steel-material-list";
import {
  useSlabTypeOptions,
  REQUIRED_POSITIONS_BY_TYPE,
} from "./module-default-values";
import {
  RequiredAsterisk,
  RequiredFieldBadge,
  RequiredLegend,
} from "./required-indicators";
import { UnspecifiedCard, useUnspecifiedDataInit } from "./unspecified-card";
import type { ModuleFormSource } from "./index";
import type {
  TConcreteWallPosition,
  TFck,
  TSteelMaterial,
  TSteelResistance,
} from "@/types/modules";
import type { ConcreteWallGroupedForm } from "./aggregate-helpers";

interface ModuleFormConcreteWallProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  source?: ModuleFormSource;
}

interface ConcreteVolumeRow {
  fck: TFck | number;
  volume: string | number;
  position?: TConcreteWallPosition;
  customFck?: boolean;
}

interface SteelMaterialRow {
  material: TSteelMaterial;
  other_name?: string;
  resistance: TSteelResistance;
  other_resistance?: number;
  mass: string | number;
  position?: TConcreteWallPosition;
}

type ConcreteWallFieldName = "concrete_walls" | "concrete_slabs";

const CONCRETE_WALL_POSITION_LABEL: Record<
  ConcreteWallFieldName,
  TConcreteWallPosition
> = {
  concrete_walls: "wall",
  concrete_slabs: "slab",
};

const ModuleFormConcreteWall = ({
  form,
  stepperMode = false,
  isSubmitted = false,
  source = "default",
}: ModuleFormConcreteWallProps) => {
  const { t } = useTranslation();
  const slabTypeOptions = useSlabTypeOptions();
  const fckOptions = [20, 25, 30, 35, 40, 45];

  useUnspecifiedDataInit(form);
  const cwForm = form as UseFormReturn<ConcreteWallGroupedForm>;

  const isAggregatedInputMode = source === "ifc" || source === "tqs";

  const aggregatedTitle =
    source === "ifc"
      ? (t.modules.form.ifcSourceLabel ?? "Materiais (IFC)")
      : source === "tqs"
        ? (t.modules.form.tqsSourceLabel ?? "Materiais (TQS)")
        : undefined;

  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const requiredFields: ConcreteWallFieldName[] = [
      "concrete_walls",
      "concrete_slabs",
    ];

    requiredFields.forEach((fieldName) => {
      const volumesPath = `${fieldName}.volumes` as const;
      const steelPath = `${fieldName}.steel` as const;
      const volumes = cwForm.getValues(volumesPath);
      const steel = cwForm.getValues(steelPath);

      if (!volumes || (Array.isArray(volumes) && volumes.length === 0)) {
        cwForm.setValue(volumesPath, [
          { fck: fckOptions[0] as TFck, volume: 0 },
        ] as ConcreteVolumeRow[]);
      }

      if (!steel || (Array.isArray(steel) && steel.length === 0)) {
        cwForm.setValue(steelPath, [
          {
            material: "rebar" as TSteelMaterial,
            resistance: "CA50" as TSteelResistance,
            mass: "0",
          },
        ] as SteelMaterialRow[]);
      }
    });

    const wallFormArea = cwForm.getValues("wall_form_area");
    const slabFormArea = cwForm.getValues("slab_form_area");

    if (wallFormArea === undefined) {
      cwForm.setValue("wall_form_area", "0");
    }
    if (slabFormArea === undefined) {
      cwForm.setValue("slab_form_area", "0");
    }
  }, [form, fckOptions]);

  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: string | number }>,
  ) => {
    return (
      volumes?.reduce((total, item) => {
        const volume =
          typeof item.volume === "string"
            ? parseNumber(item.volume)
            : item.volume || 0;
        return total + volume;
      }, 0) || 0
    );
  };

  const renderCompleteSection = (
    fieldName: ConcreteWallFieldName,
    title: string,
    isRequired: boolean = true,
    showCustomFckWarning: boolean = false,
  ) => {
    const volumesPath = `${fieldName}.volumes` as const;
    const steelPath = `${fieldName}.steel` as const;
    const totalVolumePath = `${fieldName}.total_volume` as const;

    const {
      fields: volumeFields,
      append: appendVolume,
      remove: removeVolume,
    } = useFieldArray({
      control: cwForm.control,
      name: volumesPath,
    });

    const position = CONCRETE_WALL_POSITION_LABEL[fieldName];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.concrete_wall.includes(position);

    const currentVolumesForCheck =
      (cwForm.getValues(volumesPath) as ConcreteVolumeRow[] | undefined) || [];
    const currentSteelForCheck =
      (cwForm.getValues(steelPath) as SteelMaterialRow[] | undefined) || [];
    const totalVolNonZero = currentVolumesForCheck.reduce(
      (sum: number, v: ConcreteVolumeRow) =>
        sum + (parseNumber(String(v.volume || "0")) > 0 ? 1 : 0),
      0,
    );
    const totalSteelNonZero = currentSteelForCheck.reduce(
      (sum: number, s: SteelMaterialRow) =>
        sum + (parseNumber(String(s.mass || "0")) > 0 ? 1 : 0),
      0,
    );
    const isEmpty =
      isRequiredPosition && (totalVolNonZero === 0 || totalSteelNonZero === 0);
    const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

    const baseBorder = isRequired ? "border-blue-500" : "border-gray-300";
    const borderColor = shouldMarkError
      ? "border-red-500 ring-red-200"
      : baseBorder;

    useWatch({
      control: cwForm.control,
      name: volumesPath,
    });
    const currentVolumes =
      (cwForm.getValues(volumesPath) as ConcreteVolumeRow[] | undefined) || [];

    const isFckUsed = (fck: number, currentIndex: number) => {
      return currentVolumes.some(
        (volume: ConcreteVolumeRow, index: number) =>
          index !== currentIndex &&
          volume.fck === fck &&
          fckOptions.includes(fck),
      );
    };

    const getNextAvailableFck = () => {
      const usedFcks = currentVolumes
        .map((volume: ConcreteVolumeRow) => volume.fck)
        .filter((fck: number) => fckOptions.includes(fck));
      return (
        (fckOptions.find((fck) => !usedFcks.includes(fck)) as TFck) ||
        (fckOptions[0] as TFck)
      );
    };

    const totalVolume = calculateTotalVolume(currentVolumes);

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary">
          {title}
          {isRequired ? <RequiredAsterisk /> : null}
        </h3>

        <Card className={`border-2 ${borderColor}`}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormField
                control={cwForm.control}
                name={totalVolumePath}
                render={() => {
                  return (
                    <FormItem className="flex flex-row items-center justify-between w-full gap-4 space-y-0">
                      <FormLabel className="text-xs text-gray-500 shrink-0 m-0">
                        {fieldName === "concrete_walls"
                          ? t.modules.form.totalWallVolume
                          : t.modules.form.totalSlabVolume}
                      </FormLabel>
                      <FormControl>
                        <span className="text-sm font-medium text-gray-600 shrink-0">
                          {totalVolume.toInternational(undefined, 2)}
                        </span>
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="space-y-3">
              {volumeFields.map((field, index) => {
                const fieldKey = `${fieldName}.volumes.${index}`;
                const fckPath = `${fieldName}.volumes.${index}.fck` as const;
                const volumePath =
                  `${fieldName}.volumes.${index}.volume` as const;
                const customFckPath =
                  `${fieldName}.volumes.${index}.customFck` as const;
                const currentFck = cwForm.watch(fckPath);
                const isCustomFck =
                  customFckSelected[fieldKey] ||
                  (currentFck && !fckOptions.includes(Number(currentFck)));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-2 items-end">
                      {!isCustomFck ? (
                        <FormField
                          control={cwForm.control}
                          name={fckPath}
                          render={({ field: fckField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t.modules.form.fckLabel}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(value) => {
                                    if (value === "other") {
                                      setCustomFckSelected((prev) => ({
                                        ...prev,
                                        [fieldKey]: true,
                                      }));
                                      fckField.onChange(70);
                                      cwForm.setValue(customFckPath, true);
                                    } else {
                                      setCustomFckSelected((prev) => ({
                                        ...prev,
                                        [fieldKey]: false,
                                      }));
                                      fckField.onChange(Number(value));
                                    }
                                  }}
                                  value={fckField.value?.toString() || ""}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue
                                      placeholder={t.modules.form.selectFck}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fckOptions.map((fck) => (
                                      <SelectItem
                                        key={fck}
                                        value={fck.toString()}
                                        disabled={isFckUsed(fck, index)}
                                      >
                                        {fck}{" "}
                                        {isFckUsed(fck, index)
                                          ? t.modules.form.inUse
                                          : ""}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="other">
                                      {t.modules.form.other}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={cwForm.control}
                          name={fckPath}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t.modules.form.otherFck}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="70"
                                  value={(field.value as number) ?? ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              {showCustomFckWarning && (
                                <div className="flex items-center gap-1 mt-1 text-orange-600 text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{t.modules.form.fckWarning}</span>
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={cwForm.control}
                        name={volumePath}
                        render={({ field: volumeField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              {t.modules.form.volume}
                              <RequiredAsterisk />
                            </FormLabel>
                            <div className="flex gap-1">
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="100"
                                  value={
                                    (volumeField.value as string | number) || ""
                                  }
                                  onChange={(e) => {
                                    const newValue = masks.numeric(
                                      e.target.value,
                                    );
                                    volumeField.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeVolume(index)}
                                className="px-2"
                                disabled={
                                  isRequiredPosition && volumeFields.length <= 1
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendVolume({
                  fck: getNextAvailableFck(),
                  volume: 0,
                } as ConcreteVolumeRow)
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <div className="border-t border-gray-200 my-4"></div>

            <SteelMaterialList
              form={form}
              name={steelPath}
              allowedMaterials={["rebar", "mesh", "other"]}
              stepperMode={stepperMode}
              isSubmitted={isSubmitted}
              isRequiredPosition={isRequiredPosition}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderOptionalSection = (title: string) => {
    const wallFormArea = cwForm.watch("wall_form_area") || 0;
    const slabFormArea = cwForm.watch("slab_form_area") || 0;
    const totalFormArea =
      parseNumber(wallFormArea as string | number) +
      parseNumber(slabFormArea as string | number);

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary dark:text-gray-300">
          {title}
        </h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel className="text-sm text-gray-600">
                  {t.modules.form.formType}
                </FormLabel>
                <Select defaultValue="metalica">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metalica">
                      {t.modules.form.metallic}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FormLabel className="text-sm text-gray-600">
                  {t.modules.form.totalForm}
                </FormLabel>
                <Input
                  type="text"
                  value={totalFormArea.toInternational(undefined, 2)}
                  readOnly
                  className="bg-gray-50 text-gray-700 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={cwForm.control}
                name="wall_form_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t.modules.form.wallFormArea}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="1000"
                        value={(field.value as string | number) || ""}
                        onChange={(e) => {
                          const value = masks.numeric(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={cwForm.control}
                name="slab_form_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t.modules.form.slabFormArea}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="400"
                        value={(field.value as string | number) || ""}
                        onChange={(e) => {
                          const value = masks.numeric(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!isAggregatedInputMode ? (
        <RequiredLegend legend={t.modules.form.requiredLegend} />
      ) : null}

      {isAggregatedInputMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <RequiredFieldBadge variant="ifc" source={source} />
        </div>
      )}

      <FormField
        control={cwForm.control}
        name="slab_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">
              {t.modules.form.slabTypeOptional}
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              key={field.value}
            >
              <FormControl>
                <SelectTrigger className="aria-invalid:border-destructive w-full">
                  <SelectValue placeholder={t.modules.form.selectSlabType} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {slabTypeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={cwForm.control}
          name="wall_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.wallThickness}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0,10"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={cwForm.control}
          name="slab_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.slabThickness}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0,10"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={cwForm.control}
          name="wall_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.wallArea}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="1000"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={cwForm.control}
          name="slab_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.slabArea}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="1000"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={cwForm.control}
          name="beam_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.beamCount}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="10"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={cwForm.control}
          name="slab_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.slabCount}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="10"
                  value={(field.value as string | number) || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {!isAggregatedInputMode && (
        <>
          {renderCompleteSection(
            "concrete_walls",
            t.modules.form.concreteWall,
            true,
          )}

          {renderCompleteSection(
            "concrete_slabs",
            t.modules.form.concreteSlab,
            true,
            true,
          )}

          {renderOptionalSection(t.modules.form.formAreaOptional)}
        </>
      )}

      <UnspecifiedCard
        form={form}
        fckOptions={fckOptions}
        customFckSelectedGlobal={customFckSelected}
        setCustomFckSelectedGlobal={setCustomFckSelected}
        concreteRootKey="unspecified.volumes"
        steelRootKey="unspecified.steel"
        formAreaKey="form_unspecified"
        isSteelRequired={isAggregatedInputMode}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        allowedMaterials={["rebar", "strand", "other"]}
        title={aggregatedTitle}
        hint={
          isAggregatedInputMode
            ? (t.modules.form.aggregatedHint ??
              "Todos os materiais de concreto e aço lançados aqui, sem vincular a elementos estruturais.")
            : undefined
        }
      />
    </div>
  );
};

export default ModuleFormConcreteWall;
