import { ModuleFormSchema } from "@/validators/moduleFormByType.validator";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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

interface ModuleFormConcreteWallProps {
  form: UseFormReturn<ModuleFormSchema>;
}

const ModuleFormConcreteWall = ({ form }: ModuleFormConcreteWallProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const caOptions = [50, 60];

  // Estados para controlar quando "Outro" foi selecionado
  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});
  const [customCaSelected, setCustomCaSelected] = useState<
    Record<string, boolean>
  >({});

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
    fieldName: "concreteWalls" | "concreteSlabs",
    title: string,
    isRequired: boolean = true,
    showCustomFckWarning: boolean = false
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
      // Os campos de total são editáveis para permitir ajustes manuais
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
                Volume total de{" "}
                {fieldName === "concreteWalls" ? "parede" : "laje"} (m³)
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
                          type="number"
                          step="0.01"
                          value={totalVolume.toFixed(2)}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                                    // Marca que "outro" foi selecionado
                                    setCustomFckSelected((prev) => ({
                                      ...prev,
                                      [fieldKey]: true,
                                    }));
                                    // Define um valor padrão
                                    fckField.onChange(70);
                                  } else {
                                    // Remove a marcação de "outro"
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
                        {showCustomFckWarning && (
                          <div className="flex items-center gap-1 mt-1 text-orange-600 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Para cálculo será considerado FCK 50</span>
                          </div>
                        )}
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
                          type="number"
                          step="0.01"
                          value={totalMass.toFixed(0)}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                                    // Marca que "outro" foi selecionado
                                    setCustomCaSelected((prev) => ({
                                      ...prev,
                                      [steelFieldKey]: true,
                                    }));
                                    // Define um valor padrão
                                    caField.onChange(60);
                                  } else {
                                    // Remove a marcação de "outro"
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

  // Renderizar seção opcional (como escada)
  const renderOptionalSection = (
    title: string,
    isFormSection: boolean = false
  ) => {
    const [volumes, setVolumes] = useState([{ fck: 50, volume: 100 }]);
    const [steels, setSteels] = useState([{ ca: 50, mass: 800 }]);

    const totalVolume = volumes.reduce(
      (total, item) => total + (item.volume || 0),
      0
    );
    const totalMass = steels.reduce(
      (total, item) => total + (item.mass || 0),
      0
    );

    return (
      <div className="space-y-3">
        {/* Título fora do container */}
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            {!isFormSection && (
              <>
                {/* Volume total */}
                <div>
                  <FormLabel className="text-sm text-gray-600">
                    Volume total de concreto (m³)
                  </FormLabel>
                  <Input
                    value={totalVolume.toFixed(2)}
                    disabled
                    className="bg-gray-50 text-gray-700 font-medium"
                  />
                </div>

                {/* Lista de volumes */}
                <div className="space-y-3">
                  {volumes.map((volume, index) => {
                    const isCustomFck = !fckOptions.includes(volume.fck);

                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-md p-3 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <FormLabel className="text-xs">FCK (MPa)</FormLabel>
                            <Select
                              defaultValue={
                                isCustomFck ? "other" : volume.fck.toString()
                              }
                              onValueChange={(value) => {
                                const newVolumes = [...volumes];
                                if (value === "other") {
                                  newVolumes[index].fck = 70; // valor padrão para custom
                                } else {
                                  newVolumes[index].fck = Number(value);
                                }
                                setVolumes(newVolumes);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fckOptions.map((fck) => (
                                  <SelectItem key={fck} value={fck.toString()}>
                                    {fck}
                                  </SelectItem>
                                ))}
                                <SelectItem value="other">Outro</SelectItem>
                              </SelectContent>
                            </Select>

                            {isCustomFck && (
                              <Input
                                type="number"
                                placeholder="70"
                                value={volume.fck}
                                onChange={(e) => {
                                  const newVolumes = [...volumes];
                                  newVolumes[index].fck = Number(
                                    e.target.value
                                  );
                                  setVolumes(newVolumes);
                                }}
                                className="mt-2"
                              />
                            )}
                          </div>

                          <div>
                            <FormLabel className="text-xs">
                              Volume (m³)
                            </FormLabel>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={volume.volume}
                                onChange={(e) => {
                                  const newVolumes = [...volumes];
                                  newVolumes[index].volume = Number(
                                    e.target.value
                                  );
                                  setVolumes(newVolumes);
                                }}
                              />
                              {volumes.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setVolumes(
                                      volumes.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
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
                    setVolumes([...volumes, { fck: 50, volume: 0 }])
                  }
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
                  <Input
                    value={totalMass.toFixed(0)}
                    disabled
                    className="bg-gray-50 text-gray-700 font-medium"
                  />
                </div>

                {/* Lista de aços */}
                <div className="space-y-3">
                  {steels.map((steel, index) => {
                    const isCustomCa = !caOptions.includes(steel.ca);

                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-md p-3 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <FormLabel className="text-xs">CA</FormLabel>
                            <Select
                              defaultValue={
                                isCustomCa ? "other" : steel.ca.toString()
                              }
                              onValueChange={(value) => {
                                const newSteels = [...steels];
                                if (value === "other") {
                                  newSteels[index].ca = 60; // valor padrão para custom
                                } else {
                                  newSteels[index].ca = Number(value);
                                }
                                setSteels(newSteels);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
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

                            {isCustomCa && (
                              <Input
                                type="number"
                                placeholder="CA60"
                                value={steel.ca}
                                onChange={(e) => {
                                  const newSteels = [...steels];
                                  newSteels[index].ca = Number(e.target.value);
                                  setSteels(newSteels);
                                }}
                                className="mt-2"
                              />
                            )}
                          </div>

                          <div>
                            <FormLabel className="text-xs">
                              Massa (kg)
                            </FormLabel>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={steel.mass}
                                onChange={(e) => {
                                  const newSteels = [...steels];
                                  newSteels[index].mass = Number(
                                    e.target.value
                                  );
                                  setSteels(newSteels);
                                }}
                              />
                              {steels.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSteels(
                                      steels.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSteels([...steels, { ca: 50, mass: 0 }])}
                  className="w-full text-green-600 border-green-600 hover:bg-green-50"
                >
                  Adicionar
                </Button>
              </>
            )}

            {/* Seção específica para formas */}
            {isFormSection && (
              <>
                <div>
                  <FormLabel className="text-sm text-gray-600">
                    Tipo de forma
                  </FormLabel>
                  <Select defaultValue="metalica">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metalica">Metálica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <FormLabel className="text-xs">
                      Forma de parede (m²)
                    </FormLabel>
                    <Input type="number" step="0.01" placeholder="1000" />
                  </div>

                  <div>
                    <FormLabel className="text-xs">
                      Forma de laje (m²)
                    </FormLabel>
                    <Input type="number" step="0.01" placeholder="400" />
                  </div>

                  <div>
                    <FormLabel className="text-xs">Forma total (m²)</FormLabel>
                    <Input type="number" step="0.01" placeholder="1400" />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-green-600 border-green-600 hover:bg-green-50"
                >
                  Adicionar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Campos principais de espessura */}
      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="wallThickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Espessura da parede (m)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,10"
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
          name="slabThickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Espessura da laje (m)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,10"
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
          name="formArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Área de laje (m²)</FormLabel>
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

        <FormField
          control={form.control}
          name="wallArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Área de parede (m²)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1000"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Parede de concreto */}
      {renderCompleteSection("concreteWalls", "Parede de concreto", true)}

      {/* Laje de concreto */}
      {renderCompleteSection("concreteSlabs", "Laje de concreto", true, true)}

      {/* Escada (opcional) */}
      {renderOptionalSection("Escada (opcional)")}

      {/* Área de formas (opcional) */}
      {renderOptionalSection("Área de formas (opcional)", true)}
    </div>
  );
};

export default ModuleFormConcreteWall;
