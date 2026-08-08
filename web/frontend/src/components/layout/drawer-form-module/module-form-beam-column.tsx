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
import { RequiredAsterisk, RequiredLegend } from "./required-indicators";
import { UnspecifiedCard, useUnspecifiedDataInit } from "./unspecified-card";

interface ModuleFormBeamColumnProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
}

const BEAM_COLUMN_POSITION_LABEL: Record<string, string> = {
  concrete_columns: "column",
  concrete_beams: "beam",
  concrete_slabs: "slab",
};

const ModuleFormBeamColumn = ({
  form,
  stepperMode = false,
  isSubmitted = false,
}: ModuleFormBeamColumnProps) => {
  const { t } = useTranslation();
  const slabTypeOptions = useSlabTypeOptions();
  const fckOptions = [20, 25, 30, 35, 40, 45];

  useUnspecifiedDataInit(form as any);

  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const requiredFields = [
      "concrete_columns",
      "concrete_beams",
      "concrete_slabs",
    ];

    requiredFields.forEach((fieldName) => {
      const volumes = form.getValues(`${fieldName}.volumes` as any);
      const steel = form.getValues(`${fieldName}.steel` as any);

      if (!volumes || volumes.length === 0) {
        form.setValue(`${fieldName}.volumes` as any, [
          { fck: fckOptions[0], volume: 0 },
        ]);
      }

      if (!steel || steel.length === 0) {
        form.setValue(`${fieldName}.steel` as any, [
          { material: "rebar", resistance: "CA50", mass: "0" },
        ]);
      }
    });
  }, [form, fckOptions]);

  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: string }>,
  ) => {
    return (
      volumes?.reduce(
        (total, item) => total + parseNumber(item.volume || "0"),
        0,
      ) || 0
    );
  };

  const renderCompleteSection = (
    fieldName: "concrete_columns" | "concrete_beams" | "concrete_slabs",
    title: string,
    isRequired: boolean = true,
  ) => {
    const {
      fields: volumeFields,
      append: appendVolume,
      remove: removeVolume,
    } = useFieldArray({
      control: form.control,
      name: `${fieldName}.volumes` as any,
    });

    const position = BEAM_COLUMN_POSITION_LABEL[fieldName];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.beam_column.includes(position);

    const currentVolumesForCheck =
      form.getValues(`${fieldName}.volumes` as any) || [];
    const currentSteelForCheck =
      form.getValues(`${fieldName}.steel` as any) || [];
    const totalVolNonZero = currentVolumesForCheck.reduce(
      (sum: number, v: any) => sum + (parseNumber(v.volume || "0") > 0 ? 1 : 0),
      0,
    );
    const totalSteelNonZero = currentSteelForCheck.reduce(
      (sum: number, s: any) => sum + (parseNumber(s.mass || "0") > 0 ? 1 : 0),
      0,
    );
    const isEmpty =
      isRequiredPosition && (totalVolNonZero === 0 || totalSteelNonZero === 0);
    const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

    const baseBorder = isRequired ? "border-blue-500" : "border-gray-300";
    const borderColor = shouldMarkError
      ? "border-red-500 ring-red-200"
      : baseBorder;

    useWatch({ control: form.control, name: `${fieldName}.volumes` as any });
    const currentVolumes = form.getValues(`${fieldName}.volumes` as any) || [];

    const isFckUsed = (fck: number, currentIndex: number) => {
      return currentVolumes.some(
        (volume: any, index: number) =>
          index !== currentIndex &&
          volume.fck === fck &&
          fckOptions.includes(fck),
      );
    };

    const getNextAvailableFck = () => {
      const usedFcks = currentVolumes
        .map((volume: any) => volume.fck)
        .filter((fck: number) => fckOptions.includes(fck));
      return fckOptions.find((fck) => !usedFcks.includes(fck)) || fckOptions[0];
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
              <FormLabel className="text-xs text-gray-500">
                {t.modules.form.totalConcreteVolume}
              </FormLabel>
              <FormField
                control={form.control}
                name={`${fieldName}.total_volume` as any}
                render={() => {
                  return (
                    <FormItem>
                      <FormControl>
                        <span className="text-sm font-medium text-gray-600">
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
                const currentFck = form.watch(
                  `${fieldName}.volumes.${index}.fck` as any,
                );
                const fieldKey = `${fieldName}.volumes.${index}`;
                const isCustomFck =
                  customFckSelected[fieldKey] ||
                  (currentFck && !fckOptions.includes(currentFck));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`${fieldName}.volumes.${index}.fck` as any}
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
                                    form.setValue(
                                      `${fieldKey}.customFck` as any,
                                      true,
                                    );
                                    fckField.onChange(70);
                                  } else {
                                    setCustomFckSelected((prev) => ({
                                      ...prev,
                                      [fieldKey]: false,
                                    }));
                                    fckField.onChange(Number(value));
                                  }
                                }}
                                value={
                                  isCustomFck
                                    ? "other"
                                    : fckField.value?.toString() || ""
                                }
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

                      <FormField
                        control={form.control}
                        name={`${fieldName}.volumes.${index}.volume` as any}
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
                                  value={volumeField.value || ""}
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

                    {isCustomFck && (
                      <FormField
                        control={form.control}
                        name={`${fieldKey}.fck` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              {t.modules.form.otherFck}
                              <RequiredAsterisk />
                            </FormLabel>
                            <Input
                              type="number"
                              placeholder="70"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendVolume({ fck: getNextAvailableFck(), volume: 0 })
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <div className="border-t border-gray-200 my-4"></div>

            <SteelMaterialList
              form={form}
              name={`${fieldName}.steel`}
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
      <RequiredLegend legend={t.modules.form.requiredLegend} />

      <FormField
        control={form.control}
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
          control={form.control}
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
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
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
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(masks.numeric(e.target.value))
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Pilares */}
      {renderCompleteSection(
        "concrete_columns",
        t.modules.form.concreteColumn,
        true,
      )}

      {/* Vigas */}
      {renderCompleteSection(
        "concrete_beams",
        t.modules.form.concreteBeam,
        true,
      )}

      {/* Lajes */}
      {renderCompleteSection(
        "concrete_slabs",
        t.modules.form.concreteSlab,
        true,
      )}

      {/* Formas */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary dark:text-gray-300">
          {t.modules.form.formAreaOptional}
        </h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 items-end">
              <FormField
                control={form.control}
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
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(masks.numeric(e.target.value))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(masks.numeric(e.target.value))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                        value={field.value || ""}
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
                  const formColumns = form.watch("form_columns") || 0;
                  const formBeams = form.watch("form_beams") || 0;
                  const formSlabs = form.watch("form_slabs") || 0;
                  const totalArea =
                    parseNumber(formColumns as unknown as string) +
                    parseNumber(formBeams as unknown as string) +
                    parseNumber(formSlabs as unknown as string);

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

      {/* Sem Posição / Geral */}
      <UnspecifiedCard
        form={form as any}
        fckOptions={fckOptions}
        customFckSelectedGlobal={customFckSelected}
        setCustomFckSelectedGlobal={setCustomFckSelected}
        concreteRootKey="unspecified.volumes"
        steelRootKey="unspecified.steel"
        formAreaKey="form_unspecified"
        isSteelRequired={false}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        allowedMaterials={["rebar", "strand", "other"]}
      />
    </div>
  );
};

export default ModuleFormBeamColumn;
