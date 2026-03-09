import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { ModuleFormInput } from "@/validators/moduleFormByType.validator";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import SteelMaterialList from "./steel-material-list";

interface ModuleFormConcreteWallProps {
  form: UseFormReturn<ModuleFormInput>;
}

const ModuleFormConcreteWall = ({ form }: ModuleFormConcreteWallProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];

  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const requiredFields = ["concrete_walls", "concrete_slabs"];

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

    // Initialize form area fields if not set
    const wallFormArea = form.getValues("wall_form_area");
    const slabFormArea = form.getValues("slab_form_area");

    if (wallFormArea === undefined) {
      form.setValue("wall_form_area", "0");
    }
    if (slabFormArea === undefined) {
      form.setValue("slab_form_area", "0");
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
    fieldName: "concrete_walls" | "concrete_slabs",
    title: string,
    isRequired: boolean = true,
    showCustomFckWarning: boolean = false,
  ) => {
    const {
      fields: volumeFields,
      append: appendVolume,
      remove: removeVolume,
    } = useFieldArray({
      control: form.control,
      name: `${fieldName}.volumes` as any,
    });

    const borderColor = isRequired ? "border-blue-500" : "border-gray-300";

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
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>

        <Card className={`border-2 ${borderColor}`}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                Volume total de{" "}
                {fieldName === "concrete_walls" ? "parede" : "laje"} (m³)
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
                const fieldKey = `${fieldName}.volumes.${index}`;
                const currentFck = form.watch(`${fieldKey}.fck` as any);
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
                        name={`${fieldKey}.fck` as any}
                        render={({ field: fckField }) => (
                          <FormItem>
                            <FormLabel className="text-xs">fck (MPa)</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  if (value === "other") {
                                    setCustomFckSelected((prev) => ({
                                      ...prev,
                                      [fieldKey]: true,
                                    }));
                                    fckField.onChange(70);
                                    form.setValue(
                                      `${fieldKey}.customFck` as any,
                                      true,
                                    );
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
                                  <SelectValue placeholder="Selecione fck" />
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
                        name={`${fieldKey}.volume` as any}
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
                              Outro fck (MPa)
                            </FormLabel>
                            <Input
                              type="number"
                              placeholder="70"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                            {showCustomFckWarning && (
                              <div className="flex items-center gap-1 mt-1 text-orange-600 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                <span>
                                  Para cálculo será considerado fck 50
                                </span>
                              </div>
                            )}
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

            <SteelMaterialList
              form={form}
              name={`${fieldName}.steel`}
              allowedMaterials={["rebar", "mesh", "other"]}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderOptionalSection = (title: string) => {
    // Form section implementation
    const wallFormArea = form.watch("wall_form_area") || 0;
    const slabFormArea = form.watch("slab_form_area") || 0;
    const totalFormArea =
      parseNumber(wallFormArea as unknown as string) +
      parseNumber(slabFormArea as unknown as string);

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel className="text-sm text-gray-600">
                  Tipo de forma
                </FormLabel>
                <Select defaultValue="metalica">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metalica">Metálica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FormLabel className="text-sm text-gray-600">
                  Forma total (m²)
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
                control={form.control}
                name="wall_form_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de parede (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="1000"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = masks.numeric(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slab_form_area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de laje (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="400"
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = masks.numeric(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
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
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="wall_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Espessura da parede (m)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0,10"
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
          name="slab_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Espessura da laje (m)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="0,10"
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
          name="wall_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Área de parede (m²)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="1000"
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

      {/* Parede de concreto */}
      {renderCompleteSection("concrete_walls", "Parede de concreto", true)}

      {/* Laje de concreto */}
      {renderCompleteSection("concrete_slabs", "Laje de concreto", true, true)}

      {/* Escada (opcional) */}
      {/* {renderOptionalSection("Escada (opcional)")} */}

      {/* Área de formas (opcional) */}
      {renderOptionalSection("Área de formas (opcional)")}
    </div>
  );
};

export default ModuleFormConcreteWall;
