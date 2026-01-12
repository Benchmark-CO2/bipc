import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { ModuleFormInput } from "@/validators/moduleFormByType.validator";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ModuleFormBeamColumnProps {
  form: UseFormReturn<ModuleFormInput>;
}

const ModuleFormBeamColumn = ({ form }: ModuleFormBeamColumnProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const caOptions = [50, 60];

  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});
  const [customCaSelected, setCustomCaSelected] = useState<
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
          { ca: caOptions[0], mass: 0 },
        ]);
      }
    });
  }, [form, fckOptions, caOptions]);

  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: string }>
  ) => {
    return (
      volumes?.reduce(
        (total, item) => total + parseNumber(item.volume || "0"),
        0
      ) || 0
    );
  };

  const calculateTotalMass = (steel: Array<{ ca: number; mass: string }>) => {
    return (
      steel?.reduce(
        (total, item) => total + parseNumber(item.mass || "0"),
        0
      ) || 0
    );
  };

  const renderCompleteSection = (
    fieldName: "concrete_columns" | "concrete_beams" | "concrete_slabs",
    title: string,
    isRequired: boolean = true
  ) => {
    const {
      fields: volumeFields,
      append: appendVolume,
      remove: removeVolume,
    } = useFieldArray({
      control: form.control,
      name: `${fieldName}.volumes` as any,
    });

    const {
      fields: steelFields,
      append: appendSteel,
      remove: removeSteel,
    } = useFieldArray({
      control: form.control,
      name: `${fieldName}.steel` as any,
    });

    const borderColor = isRequired ? "border-blue-500" : "border-gray-300";

    useWatch({ control: form.control, name: `${fieldName}.volumes` as any });
    useWatch({ control: form.control, name: `${fieldName}.steel` as any });
    const currentVolumes = form.getValues(`${fieldName}.volumes` as any) || [];
    const currentSteel = form.getValues(`${fieldName}.steel` as any) || [];

    const isFckUsed = (fck: number, currentIndex: number) => {
      return currentVolumes.some(
        (volume: any, index: number) =>
          index !== currentIndex &&
          volume.fck === fck &&
          fckOptions.includes(fck)
      );
    };

    const isCaUsed = (ca: number, currentIndex: number) => {
      return currentSteel.some(
        (steel: any, index: number) =>
          index !== currentIndex && steel.ca === ca && caOptions.includes(ca)
      );
    };

    const getNextAvailableFck = () => {
      const usedFcks = currentVolumes
        .map((volume: any) => volume.fck)
        .filter((fck: number) => fckOptions.includes(fck));
      return fckOptions.find((fck) => !usedFcks.includes(fck)) || fckOptions[0];
    };

    const getNextAvailableCa = () => {
      const usedCas = currentSteel
        .map((steel: any) => steel.ca)
        .filter((ca: number) => caOptions.includes(ca));
      return caOptions.find((ca) => !usedCas.includes(ca)) || caOptions[0];
    };

    const totalVolume = calculateTotalVolume(currentVolumes);
    const totalMass = calculateTotalMass(currentSteel);

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>

        <Card className={`border-2 ${borderColor}`}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                Volume total de concreto (m³)
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
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="space-y-3">
              {volumeFields.map((field, index) => {
                const currentFck = form.watch(
                  `${fieldName}.volumes.${index}.fck` as any
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
                            <FormLabel className="text-xs">FCK (MPa)</FormLabel>
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
                                      true
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
                                  <SelectValue placeholder="Selecione FCK" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fckOptions.map((fck) => (
                                    <SelectItem
                                      key={fck}
                                      value={fck.toString()}
                                      disabled={isFckUsed(fck, index)}
                                    >
                                      {fck}{" "}
                                      {isFckUsed(fck, index) ? "(Em uso)" : ""}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`${fieldName}.volumes.${index}.volume` as any}
                        render={({ field: volumeField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Volume (m³)
                            </FormLabel>
                            <div className="flex gap-1">
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="100"
                                  value={volumeField.value || ""}
                                  onChange={(e) => {
                                    const newValue = masks.numeric(
                                      e.target.value
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
                                disabled={volumeFields.length <= 1}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            <FormMessage />
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
                              Outro FCK (MPa)
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
              Adicionar
            </Button>

            <div className="border-t border-gray-200 my-4"></div>

            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                Aço total (kg)
              </FormLabel>
              <FormField
                control={form.control}
                name={`${fieldName}.total_mass` as any}
                render={() => {
                  return (
                    <FormItem>
                      <FormControl>
                        <span className="text-sm font-medium text-gray-600">
                          {totalMass.toInternational(undefined, 0)}
                        </span>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="space-y-3">
              {steelFields.map((field, index) => {
                const currentCa = form.watch(
                  `${fieldName}.steel.${index}.ca` as any
                );
                const steelFieldKey = `${fieldName}.steel.${index}`;
                const isCustomCa =
                  customCaSelected[steelFieldKey] ||
                  (currentCa && !caOptions.includes(currentCa));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`${fieldName}.steel.${index}.ca` as any}
                        render={({ field: caField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">CA</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  if (value === "other") {
                                    setCustomCaSelected((prev) => ({
                                      ...prev,
                                      [steelFieldKey]: true,
                                    }));
                                    form.setValue(
                                      `${fieldName}.steel.${index}.customCa` as any,
                                      true
                                    );
                                    caField.onChange(60);
                                  } else {
                                    setCustomCaSelected((prev) => ({
                                      ...prev,
                                      [steelFieldKey]: false,
                                    }));
                                    caField.onChange(Number(value));
                                  }
                                }}
                                value={
                                  isCustomCa
                                    ? "other"
                                    : caField.value?.toString() || ""
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione CA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {caOptions.map((ca) => (
                                    <SelectItem
                                      key={ca}
                                      value={ca.toString()}
                                      disabled={isCaUsed(ca, index)}
                                    >
                                      CA{ca}{" "}
                                      {isCaUsed(ca, index) ? "(Em uso)" : ""}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`${fieldName}.steel.${index}.mass` as any}
                        render={({ field: massField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Massa (kg)
                            </FormLabel>
                            <div className="flex gap-1">
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="800"
                                  value={massField.value || ""}
                                  onChange={(e) => {
                                    const newValue = masks.numeric(
                                      e.target.value
                                    );
                                    massField.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSteel(index)}
                                className="px-2"
                                disabled={steelFields.length <= 1}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {isCustomCa && (
                      <FormField
                        control={form.control}
                        name={`${fieldName}.steel.${index}.ca` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Outro CA</FormLabel>
                            <Input
                              {...field}
                              type="number"
                              placeholder="60"
                              onChange={(e) => {
                                field.onChange(Number(e.target.value));
                              }}
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
              onClick={() => appendSteel({ ca: getNextAvailableCa(), mass: 0 })}
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              Adicionar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 items-end">
        <FormField
          control={form.control}
          name="column_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Número de pilares</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avg_beam_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Vão médio das vigas (m)</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avg_slab_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Vão médio das lajes (m)</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Pilares */}
      {renderCompleteSection("concrete_columns", "Pilar de concreto", true)}

      {/* Vigas */}
      {renderCompleteSection("concrete_beams", "Viga de concreto", true)}

      {/* Lajes */}
      {renderCompleteSection("concrete_slabs", "Laje de concreto", true)}

      {/* Formas */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Área de formas (opcional)
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
                      Forma de pilares (m²)
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form_beams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de vigas (m²)
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form_slabs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de lajes (m²)
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-xs">Forma total (m²)</FormLabel>
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
    </div>
  );
};

export default ModuleFormBeamColumn;
