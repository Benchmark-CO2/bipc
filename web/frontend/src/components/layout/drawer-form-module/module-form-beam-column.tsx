import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { useTranslation } from "@/i18n";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { Plus, Trash2 } from "lucide-react";
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
  TBeamColumnPosition,
  TFck,
  TSteelMaterial,
  TSteelResistance,
} from "@/types/modules";
import type { BeamColumnGroupedForm } from "./aggregate-helpers";

interface ModuleFormBeamColumnProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  source?: ModuleFormSource;
}

interface ConcreteVolumeRow {
  fck: TFck | number;
  volume: string | number;
  position?: TBeamColumnPosition;
  customFck?: boolean;
}

interface SteelMaterialRow {
  material: TSteelMaterial;
  other_name?: string;
  resistance: TSteelResistance;
  other_resistance?: number;
  mass: string | number;
  position?: TBeamColumnPosition;
}

type BeamColumnFieldName =
  | "concrete_columns"
  | "concrete_beams"
  | "concrete_slabs";

const BEAM_COLUMN_POSITION_LABEL: Record<
  BeamColumnFieldName,
  TBeamColumnPosition
> = {
  concrete_columns: "column",
  concrete_beams: "beam",
  concrete_slabs: "slab",
};

const ModuleFormBeamColumn = ({
  form,
  stepperMode = false,
  isSubmitted = false,
  source = "default",
}: ModuleFormBeamColumnProps) => {
  const { t } = useTranslation();
  const slabTypeOptions = useSlabTypeOptions();
  const fckOptions = [20, 25, 30, 35, 40, 45];

  useUnspecifiedDataInit(form);
  const bcForm = form as UseFormReturn<BeamColumnGroupedForm>;

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
    const requiredFields: BeamColumnFieldName[] = [
      "concrete_columns",
      "concrete_beams",
      "concrete_slabs",
    ];

    requiredFields.forEach((fieldName) => {
      const volumesPath = `${fieldName}.volumes` as const;
      const steelPath = `${fieldName}.steel` as const;
      const volumes = bcForm.getValues(volumesPath);
      const steel = bcForm.getValues(steelPath);

      if (!volumes || (Array.isArray(volumes) && volumes.length === 0)) {
        bcForm.setValue(volumesPath, [
          { fck: fckOptions[0] as TFck, volume: 0 },
        ] as ConcreteVolumeRow[]);
      }

      if (!steel || (Array.isArray(steel) && steel.length === 0)) {
        bcForm.setValue(steelPath, [
          {
            material: "rebar" as TSteelMaterial,
            resistance: "CA50" as TSteelResistance,
            mass: "0",
          },
        ] as SteelMaterialRow[]);
      }
    });
  }, [form, fckOptions]);

  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: string | number }>,
  ) => {
    return (
      volumes?.reduce(
        (total, item) => total + parseNumber(String(item.volume || "0")),
        0,
      ) || 0
    );
  };

  const renderCompleteSection = (
    fieldName: BeamColumnFieldName,
    title: string,
    isRequired: boolean = true,
  ) => {
    const volumesPath = `${fieldName}.volumes` as const;
    const steelPath = `${fieldName}.steel` as const;
    const totalVolumePath = `${fieldName}.total_volume` as const;

    const {
      fields: volumeFields,
      append: appendVolume,
      remove: removeVolume,
    } = useFieldArray({
      control: bcForm.control,
      name: volumesPath,
    });

    const position = BEAM_COLUMN_POSITION_LABEL[fieldName];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.beam_column.includes(position);

    const currentVolumesForCheck =
      (bcForm.getValues(volumesPath) as ConcreteVolumeRow[] | undefined) || [];
    const currentSteelForCheck =
      (bcForm.getValues(steelPath) as SteelMaterialRow[] | undefined) || [];
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
      control: bcForm.control,
      name: volumesPath,
    });
    const currentVolumes =
      (bcForm.getValues(volumesPath) as ConcreteVolumeRow[] | undefined) || [];

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
                control={bcForm.control}
                name={totalVolumePath}
                render={() => {
                  return (
                    <FormItem className="flex flex-row items-center justify-between w-full gap-4 space-y-0">
                      <FormLabel className="text-xs text-gray-500 shrink-0 m-0">
                        {t.modules.form.totalConcreteVolume}
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
                const fckPath = `${fieldName}.volumes.${index}.fck` as const;
                const volumePath =
                  `${fieldName}.volumes.${index}.volume` as const;
                const customFckPath =
                  `${fieldName}.volumes.${index}.customFck` as const;
                const currentFck = bcForm.watch(fckPath);
                const fieldKey = `${fieldName}.volumes.${index}`;
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
                          control={bcForm.control}
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
                                      bcForm.setValue(customFckPath, true);
                                      fckField.onChange(70);
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
                          control={bcForm.control}
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
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={bcForm.control}
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
              allowedMaterials={["rebar", "strand", "other"]}
              stepperMode={stepperMode}
              isSubmitted={isSubmitted}
              isRequiredPosition={isRequiredPosition}
            />
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
        control={bcForm.control}
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

      <div className="grid grid-cols-3 gap-4 items-end">
        <FormField
          control={bcForm.control}
          name="column_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.columnCount}
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
          control={bcForm.control}
          name="avg_beam_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.avgBeamSpan}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="6,00"
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
          control={bcForm.control}
          name="avg_slab_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.avgSlabSpan}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="8,00"
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

      <div className="grid grid-cols-2 gap-4 items-end">
        <FormField
          control={bcForm.control}
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
          control={bcForm.control}
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
            "concrete_columns",
            t.modules.form.concreteColumn,
            true,
          )}

          {renderCompleteSection(
            "concrete_beams",
            t.modules.form.concreteBeam,
            true,
          )}

          {renderCompleteSection(
            "concrete_slabs",
            t.modules.form.concreteSlab,
            true,
          )}

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-primary dark:text-gray-300">
              {t.modules.form.formAreaOptional}
            </h3>

            <Card className="border-2 border-gray-300">
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 items-end">
                  <FormField
                    control={bcForm.control}
                    name="form_columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.formColumns}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="100"
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
                    control={bcForm.control}
                    name="form_beams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.formBeams}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="200"
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
                    control={bcForm.control}
                    name="form_slabs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.formSlabs}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="400"
                            value={(field.value as string | number) || ""}
                            onChange={(e) =>
                              field.onChange(masks.numeric(e.target.value))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel className="text-xs">
                      {t.modules.form.totalForm}
                    </FormLabel>
                    {(() => {
                      const formColumns = bcForm.watch("form_columns") || 0;
                      const formBeams = bcForm.watch("form_beams") || 0;
                      const formSlabs = bcForm.watch("form_slabs") || 0;
                      const totalArea =
                        parseNumber(formColumns as string | number) +
                        parseNumber(formBeams as string | number) +
                        parseNumber(formSlabs as string | number);

                      return (
                        <Input
                          type="text"
                          value={totalArea.toInternational(undefined, 2)}
                          readOnly
                          className="bg-gray-50 text-gray-700 font-medium"
                        />
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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

export default ModuleFormBeamColumn;
