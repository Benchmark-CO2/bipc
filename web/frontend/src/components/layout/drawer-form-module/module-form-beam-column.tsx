import { ModuleFormSchema } from "@/validators/moduleFormByType.validator";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
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
  form: UseFormReturn<ModuleFormSchema>;
}

const ModuleFormBeamColumn = ({ form }: ModuleFormBeamColumnProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const caOptions = [50, 60];

  // Estados para controlar quando "Outro" foi selecionado
  const [customFckSelected, setCustomFckSelected] = useState<Record<string, boolean>>({});
  const [customCaSelected, setCustomCaSelected] = useState<Record<string, boolean>>({});

  // Função para calcular volume total
  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: number }>
  ) => {
    return volumes?.reduce((total, item) => total + (item.volume || 0), 0) || 0;
  };

  // Função para calcular massa total
  const calculateTotalMass = (steel: Array<{ ca: number; mass: number }>) => {
    return steel?.reduce((total, item) => total + (item.mass || 0), 0) || 0;
  };

  // Renderizar seção completa (volumes + steel)
  const renderCompleteSection = (
    fieldName: "concreteColumns" | "concreteBeams" | "concreteSlabs",
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

    const currentVolumes = form.watch(`${fieldName}.volumes` as any) || [];
    const currentSteel = form.watch(`${fieldName}.steel` as any) || [];
    const totalVolume = calculateTotalVolume(currentVolumes);
    const totalMass = calculateTotalMass(currentSteel);

    // Atualização automática dos totais quando valores mudam
    useEffect(() => {
      // Os campos de total são atualizados automaticamente através do watch
    }, [currentVolumes, currentSteel]);

    return (
      <div className="space-y-3">
        {/* Título fora do container */}
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>

        <Card className={`border-2 ${borderColor}`}>
          <CardContent className="space-y-4">
            {/* Volume total */}
            <div>
              <FormLabel className="text-sm text-gray-600">
                Volume total de concreto (m³)
              </FormLabel>
              <FormField
                control={form.control}
                name={`${fieldName}.totalVolume` as any}
                render={({ field }) => {
                  // Atualiza automaticamente com o total calculado
                  useEffect(() => {
                    field.onChange(totalVolume);
                  }, [totalVolume, field]);

                  return (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          value={totalVolume.toFixed(2)}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="bg-gray-50 text-gray-700 font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Lista de volumes */}
            <div className="space-y-3">
              {volumeFields.map((field, index) => {
                const currentFck = form.watch(
                  `${fieldName}.volumes.${index}.fck` as any
                );
                const fieldKey = `${fieldName}.volumes.${index}`;
                const isCustomFck = customFckSelected[fieldKey] || (currentFck && !fckOptions.includes(currentFck));

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
                                    // Marca que "outro" foi selecionado
                                    setCustomFckSelected(prev => ({
                                      ...prev,
                                      [fieldKey]: true
                                    }));
                                    // Define um valor padrão
                                    fckField.onChange(70);
                                  } else {
                                    // Remove a marcação de "outro"
                                    setCustomFckSelected(prev => ({
                                      ...prev,
                                      [fieldKey]: false
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
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione FCK" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fckOptions.map((fck) => (
                                    <SelectItem
                                      key={fck}
                                      value={fck.toString()}
                                    >
                                      {fck}
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
                                  type="number"
                                  step="0.01"
                                  placeholder="100"
                                  value={volumeField.value || ""}
                                  onChange={(e) =>
                                    volumeField.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              {volumeFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeVolume(index)}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Campo customizado para FCK */}
                    {isCustomFck && (
                      <div>
                        <FormLabel className="text-xs">
                          Outro FCK (MPa)
                        </FormLabel>
                        <Input
                          type="number"
                          placeholder="70"
                          value={currentFck || ""}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            form.setValue(
                              `${fieldName}.volumes.${index}.fck` as any,
                              value
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendVolume({ fck: 20, volume: 0 })}
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              Adicionar
            </Button>

            {/* Divider discreto */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Aço total */}
            <div>
              <FormLabel className="text-sm text-gray-600">
                Aço total (kg)
              </FormLabel>
              <FormField
                control={form.control}
                name={`${fieldName}.totalMass` as any}
                render={({ field }) => {
                  // Atualiza automaticamente com o total calculado
                  useEffect(() => {
                    field.onChange(totalMass);
                  }, [totalMass, field]);

                  return (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          value={totalMass.toFixed(0)}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="bg-gray-50 text-gray-700 font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Lista de aços */}
            <div className="space-y-3">
              {steelFields.map((field, index) => {
                const currentCa = form.watch(
                  `${fieldName}.steel.${index}.ca` as any
                );
                const steelFieldKey = `${fieldName}.steel.${index}`;
                const isCustomCa = customCaSelected[steelFieldKey] || (currentCa && !caOptions.includes(currentCa));

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
                                    // Marca que "outro" foi selecionado
                                    setCustomCaSelected(prev => ({
                                      ...prev,
                                      [steelFieldKey]: true
                                    }));
                                    // Define um valor padrão
                                    caField.onChange(60);
                                  } else {
                                    // Remove a marcação de "outro"
                                    setCustomCaSelected(prev => ({
                                      ...prev,
                                      [steelFieldKey]: false
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
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione CA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {caOptions.map((ca) => (
                                    <SelectItem key={ca} value={ca.toString()}>
                                      CA{ca}
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
                                  type="number"
                                  step="0.01"
                                  placeholder="800"
                                  value={massField.value || ""}
                                  onChange={(e) =>
                                    massField.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              {steelFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeSteel(index)}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Campo customizado para CA */}
                    {isCustomCa && (
                      <div>
                        <FormLabel className="text-xs">Outro CA</FormLabel>
                        <Input
                          type="number"
                          placeholder="CA60"
                          value={currentCa || ""}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            form.setValue(
                              `${fieldName}.steel.${index}.ca` as any,
                              value
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendSteel({ ca: 50, mass: 0 })}
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
      {/* Campos principais */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="columnNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Número de pilares</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="10"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avgBeamSpan"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Vão médio das vigas (m)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="6,00"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avgSlabSpan"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Vão médio das lajes (m)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="8,00"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Pilares */}
      {renderCompleteSection("concreteColumns", "Pilar de concreto", true)}

      {/* Vigas */}
      {renderCompleteSection("concreteBeams", "Viga de concreto", true)}

      {/* Lajes */}
      {renderCompleteSection("concreteSlabs", "Laje de concreto", true)}

      {/* Formas */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Área de formas (opcional)
        </h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="formColumns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de pilares (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formBeams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de vigas (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="200"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formSlabs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de lajes (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="400"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-xs">Forma total (m²)</FormLabel>
                {(() => {
                  const formColumns = form.watch("formColumns") || 0;
                  const formBeams = form.watch("formBeams") || 0;
                  const formSlabs = form.watch("formSlabs") || 0;
                  const totalArea = formColumns + formBeams + formSlabs;

                  return (
                    <Input
                      type="number"
                      step="0.01"
                      value={totalArea.toFixed(2)}
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
