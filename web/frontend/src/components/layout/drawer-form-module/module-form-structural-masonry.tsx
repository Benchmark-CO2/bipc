import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { ModuleFormSchema } from "@/validators/moduleFormByType.validator";
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModuleFormStructuralMasonryProps {
  form: UseFormReturn<ModuleFormSchema>;
}

// Componente separado para cada item de graute
interface GroutItemProps {
  groutIndex: number;
  groutField: any;
  form: UseFormReturn<ModuleFormSchema>;
  groutTypes: Array<{ value: string; label: string }>;
  isGroutTypeUsed: (groutType: string, currentIndex: number) => boolean;
  onRemove: () => void;
  canRemove: boolean;
  fgkOptions: number[];
  caOptions: number[];
  customFgkSelected: Record<string, boolean>;
  setCustomFgkSelected: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  customCaSelected: Record<string, boolean>;
  setCustomCaSelected: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

const GroutItem = ({
  groutIndex,
  groutField,
  form,
  groutTypes,
  isGroutTypeUsed,
  onRemove,
  canRemove,
  fgkOptions,
  caOptions,
  customFgkSelected,
  setCustomFgkSelected,
  customCaSelected,
  setCustomCaSelected,
}: GroutItemProps) => {
  const volumesFieldArray = useFieldArray({
    control: form.control,
    name: `grout.${groutIndex}.volumes`,
  });

  const steelFieldArray = useFieldArray({
    control: form.control,
    name: `grout.${groutIndex}.steel`,
  });

  const volumes = form.watch(`grout.${groutIndex}.volumes`) || [];
  const steel = form.watch(`grout.${groutIndex}.steel`) || [];

  const totalVolume = volumes.reduce(
    (sum: number, item: any) => sum + (item.volume || 0),
    0
  );
  const totalMass = steel.reduce(
    (sum: number, item: any) => sum + (item.mass || 0),
    0
  );

  return (
    <Card key={groutField.id} className="border-2 border-blue-500">
      <CardContent className="space-y-4">
        {/* Header com tipo e botão remover */}
        <div className="flex items-center justify-between pt-4">
          <FormField
            control={form.control}
            name={`grout.${groutIndex}.type`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-xs font-medium">
                  Tipo de graute *
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {groutTypes.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          disabled={isGroutTypeUsed(type.value, groutIndex)}
                        >
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {canRemove && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="ml-4 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Volumes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-1 border-b">
            <FormLabel className="text-xs font-medium text-gray-700">
              Volumes de graute
            </FormLabel>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-sm font-semibold text-gray-900">
                {totalVolume.toFixed(2)} m³
              </span>
            </div>
          </div>

          {volumesFieldArray.fields.map((volumeField, volumeIndex) => {
            const isCustomFgk =
              customFgkSelected[`grout-${groutIndex}-volume-${volumeIndex}`] ||
              false;

            return (
              <div key={volumeField.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`grout.${groutIndex}.volumes.${volumeIndex}.fgk`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">Fgk (MPa)</FormLabel>
                      <FormControl>
                        {isCustomFgk ? (
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Outro"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCustomFgkSelected((prev) => ({
                                  ...prev,
                                  [`grout-${groutIndex}-volume-${volumeIndex}`]:
                                    false,
                                }));
                                field.onChange(fgkOptions[0]);
                              }}
                              className="text-xs"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setCustomFgkSelected((prev) => ({
                                  ...prev,
                                  [`grout-${groutIndex}-volume-${volumeIndex}`]:
                                    true,
                                }));
                                field.onChange(0);
                              } else {
                                field.onChange(Number(value));
                              }
                            }}
                            value={field.value?.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Fgk" />
                            </SelectTrigger>
                            <SelectContent>
                              {fgkOptions.map((fgk) => (
                                <SelectItem key={fgk} value={fgk.toString()}>
                                  {fgk}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`grout.${groutIndex}.volumes.${volumeIndex}.volume`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">Volume (m³)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => volumesFieldArray.remove(volumeIndex)}
                  className="shrink-0"
                  disabled={volumesFieldArray.fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => volumesFieldArray.append({ fgk: 20, volume: 0 })}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            Adicionar Volume
          </Button>
        </div>

        {/* Steel Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-1 border-b">
            <FormLabel className="text-xs font-medium text-gray-700">
              Armadura
            </FormLabel>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-sm font-semibold text-gray-900">
                {totalMass.toFixed(2)} kg
              </span>
            </div>
          </div>

          {steelFieldArray.fields.map((steelField, steelIndex) => {
            const isCustomCa =
              customCaSelected[`grout-${groutIndex}-steel-${steelIndex}`] ||
              false;

            return (
              <div key={steelField.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`grout.${groutIndex}.steel.${steelIndex}.ca`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">Categoria (MPa)</FormLabel>
                      <FormControl>
                        {isCustomCa ? (
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              step="1"
                              placeholder="Outro"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCustomCaSelected((prev) => ({
                                  ...prev,
                                  [`grout-${groutIndex}-steel-${steelIndex}`]:
                                    false,
                                }));
                                field.onChange(caOptions[0]);
                              }}
                              className="text-xs"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Select
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setCustomCaSelected((prev) => ({
                                  ...prev,
                                  [`grout-${groutIndex}-steel-${steelIndex}`]:
                                    true,
                                }));
                                field.onChange(0);
                              } else {
                                field.onChange(Number(value));
                              }
                            }}
                            value={field.value?.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="CA" />
                            </SelectTrigger>
                            <SelectContent>
                              {caOptions.map((ca) => (
                                <SelectItem key={ca} value={ca.toString()}>
                                  {ca}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`grout.${groutIndex}.steel.${steelIndex}.mass`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-xs">Massa (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => steelFieldArray.remove(steelIndex)}
                  className="shrink-0"
                  disabled={steelFieldArray.fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => steelFieldArray.append({ ca: 50, mass: 0 })}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            Adicionar Armadura
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ModuleFormStructuralMasonry = ({
  form,
}: ModuleFormStructuralMasonryProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const caOptions = [50, 60];
  const fbkOptions = [2, 4, 6, 8, 10, 12];
  const fgkOptions = [15, 20, 25, 30];
  const fakOptions = [2, 4, 5, 7, 10, 15, 20];

  const blockTypes = [
    "BL 14x4",
    "BL 14x19",
    "BL 14x34",
    "BL 14x39",
    "BL 14x54",
    "BL 19x4",
    "BL 19x19",
    "BL 19x39",
    "CL 14x19",
    "CL 14x34",
    "CL 14x14",
    "CL 14x39",
    "CL 19x19",
    "CL 19x39",
    "COMP 14x19",
    "COMP 14x39",
    "JOTA 14 x 39 x 19/9",
    "JOTA 14 x 19 x 19/9",
  ] as const;

  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});
  const [customCaSelected, setCustomCaSelected] = useState<
    Record<string, boolean>
  >({});
  const [customFbkSelected, setCustomFbkSelected] = useState<
    Record<string, boolean>
  >({});
  const [customFgkSelected, setCustomFgkSelected] = useState<
    Record<string, boolean>
  >({});
  const [customFakSelected, setCustomFakSelected] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const requiredFields = ["concrete_slabs"];
    const optionalFields = ["concrete_columns", "concrete_beams"];

    [...requiredFields, ...optionalFields].forEach((fieldName) => {
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

    const blocks = form.getValues("blocks");
    const grout = form.getValues("grout");
    const mortar = form.getValues("mortar");

    if (!blocks || blocks.length === 0) {
      form.setValue("blocks", [
        { type: "BL 14x19" as const, fbk: 6, quantity: 0 },
      ]);
    }

    if (!grout || grout.length === 0) {
      form.setValue("grout", [
        {
          type: "vertical" as const,
          volumes: [{ fgk: 20, volume: 0 }],
          steel: [{ ca: 50, mass: 0 }],
        },
      ]);
    }

    if (!mortar || mortar.length === 0) {
      form.setValue("mortar", [{ fak: 5, volume: 0 }]);
    }

    const formSlabs = form.getValues("form_slabs");
    const formColumns = form.getValues("form_columns");
    const formBeams = form.getValues("form_beams");

    if (formSlabs === undefined) {
      form.setValue("form_slabs", 0);
    }
    if (formColumns === undefined) {
      form.setValue("form_columns", 0);
    }
    if (formBeams === undefined) {
      form.setValue("form_beams", 0);
    }
  }, [form, fckOptions, caOptions]);

  const calculateTotalVolume = (
    volumes: Array<{ fck: number; volume: number }>
  ) => {
    return volumes?.reduce((total, item) => total + (item.volume || 0), 0) || 0;
  };

  const calculateTotalMass = (steel: Array<{ ca: number; mass: number }>) => {
    return steel?.reduce((total, item) => total + (item.mass || 0), 0) || 0;
  };

  const calculateTotalQuantity = (
    blocks: Array<{ type: string; fbk: number; quantity: number }>
  ) => {
    return (
      blocks?.reduce((total, item) => total + (item.quantity || 0), 0) || 0
    );
  };

  const calculateTotalMortarVolume = (
    mortar: Array<{ fak: number; volume: number }>
  ) => {
    return mortar?.reduce((total, item) => total + (item.volume || 0), 0) || 0;
  };

  const renderBlockSection = () => {
    const {
      fields: blockFields,
      append: appendBlock,
      remove: removeBlock,
    } = useFieldArray({
      control: form.control,
      name: "blocks",
    });

    useWatch({ control: form.control, name: "blocks" });
    const currentBlocks = form.getValues("blocks") || [];

    const isBlockTypeUsed = (blockType: string, currentIndex: number) => {
      return currentBlocks.some(
        (block: any, index: number) =>
          index !== currentIndex && block.type === blockType
      );
    };

    const getNextAvailableBlockType = () => {
      const usedTypes = currentBlocks.map((block: any) => block.type);
      return (
        blockTypes.find((type) => !usedTypes.includes(type)) || blockTypes[0]
      );
    };

    const totalQuantity = calculateTotalQuantity(currentBlocks);

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Blocos *</h3>

        <Card className="border-2 border-blue-500">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                Quantidade total
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalQuantity.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {blockFields.map((field, index) => {
                const isCustomFbk =
                  customFbkSelected[`block-${index}`] || false;

                return (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`blocks.${index}.type`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Tipo *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {blockTypes.map((type) => (
                                  <SelectItem
                                    key={type}
                                    value={type}
                                    disabled={isBlockTypeUsed(type, index)}
                                  >
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`blocks.${index}.fbk`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Fbk (MPa) *</FormLabel>
                          <FormControl>
                            {isCustomFbk ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Outro"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCustomFbkSelected((prev) => ({
                                      ...prev,
                                      [`block-${index}`]: false,
                                    }));
                                    field.onChange(fbkOptions[0]);
                                  }}
                                  className="text-xs"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    setCustomFbkSelected((prev) => ({
                                      ...prev,
                                      [`block-${index}`]: true,
                                    }));
                                    field.onChange(0);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                                value={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fbk" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fbkOptions.map((fbk) => (
                                    <SelectItem
                                      key={fbk}
                                      value={fbk.toString()}
                                    >
                                      {fbk}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`blocks.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">
                            Quantidade *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBlock(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendBlock({
                  type: getNextAvailableBlockType(),
                  fbk: 6,
                  quantity: 0,
                })
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              Adicionar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGroutSection = () => {
    const {
      fields: groutFields,
      append: appendGrout,
      remove: removeGrout,
    } = useFieldArray({
      control: form.control,
      name: "grout",
    });

    useWatch({ control: form.control, name: "grout" });
    const currentGrout = form.getValues("grout") || [];

    const groutTypes = [
      { value: "vertical", label: "Vertical" },
      { value: "horizontal", label: "Horizontal" },
      { value: "general", label: "Geral" },
    ];

    const isGroutTypeUsed = (groutType: string, currentIndex: number) => {
      return currentGrout.some(
        (grout: any, index: number) =>
          index !== currentIndex && grout.type === groutType
      );
    };

    const getNextAvailableGroutType = () => {
      const usedTypes = currentGrout.map((grout: any) => grout.type);
      return (
        groutTypes.find((type) => !usedTypes.includes(type.value))?.value ||
        groutTypes[0].value
      );
    };

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Graute *</h3>

        <div className="space-y-4">
          {groutFields.map((groutField, groutIndex) => (
            <GroutItem
              key={groutField.id}
              groutIndex={groutIndex}
              groutField={groutField}
              form={form}
              groutTypes={groutTypes}
              isGroutTypeUsed={isGroutTypeUsed}
              onRemove={() => removeGrout(groutIndex)}
              canRemove={groutFields.length > 1}
              fgkOptions={fgkOptions}
              caOptions={caOptions}
              customFgkSelected={customFgkSelected}
              setCustomFgkSelected={setCustomFgkSelected}
              customCaSelected={customCaSelected}
              setCustomCaSelected={setCustomCaSelected}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendGrout({
                type: getNextAvailableGroutType() as any,
                volumes: [{ fgk: 20, volume: 0 }],
                steel: [{ ca: 50, mass: 0 }],
              })
            }
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
            disabled={groutFields.length >= 3}
          >
            Adicionar tipo de graute
          </Button>
        </div>
      </div>
    );
  };

  const renderMortarSection = () => {
    const {
      fields: mortarFields,
      append: appendMortar,
      remove: removeMortar,
    } = useFieldArray({
      control: form.control,
      name: "mortar",
    });

    useWatch({ control: form.control, name: "mortar" });
    const currentMortar = form.getValues("mortar") || [];

    const totalVolume = calculateTotalMortarVolume(currentMortar);

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Argamassa *</h3>

        <Card className="border-2 border-blue-500">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                Volume total (m³)
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalVolume.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {mortarFields.map((field, index) => {
                const isCustomFak =
                  customFakSelected[`mortar-${index}`] || false;

                return (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`mortar.${index}.fak`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Fak (MPa) *</FormLabel>
                          <FormControl>
                            {isCustomFak ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Outro"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCustomFakSelected((prev) => ({
                                      ...prev,
                                      [`mortar-${index}`]: false,
                                    }));
                                    field.onChange(fakOptions[0]);
                                  }}
                                  className="text-xs"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    setCustomFakSelected((prev) => ({
                                      ...prev,
                                      [`mortar-${index}`]: true,
                                    }));
                                    field.onChange(0);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                                value={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fak" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fakOptions.map((fak) => (
                                    <SelectItem
                                      key={fak}
                                      value={fak.toString()}
                                    >
                                      {fak}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`mortar.${index}.volume`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">
                            Volume (m³) *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMortar(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendMortar({
                  fak: 5,
                  volume: 0,
                })
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              Adicionar
            </Button>
          </CardContent>
        </Card>
      </div>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalVolume.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {volumeFields.map((field, index) => {
                const isCustomFck =
                  customFckSelected[`${fieldName}-volume-${index}`] || false;

                return (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.volumes.${index}.fck`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Fck (MPa)</FormLabel>
                          <FormControl>
                            {isCustomFck ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Outro"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCustomFckSelected((prev) => ({
                                      ...prev,
                                      [`${fieldName}-volume-${index}`]: false,
                                    }));
                                    field.onChange(fckOptions[0]);
                                  }}
                                  className="text-xs"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    setCustomFckSelected((prev) => ({
                                      ...prev,
                                      [`${fieldName}-volume-${index}`]: true,
                                    }));
                                    field.onChange(0);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                                value={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fck" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fckOptions.map((fck) => (
                                    <SelectItem
                                      key={fck}
                                      value={fck.toString()}
                                      disabled={isFckUsed(fck, index)}
                                    >
                                      {fck}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`${fieldName}.volumes.${index}.volume`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Volume (m³)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVolume(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalMass.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {steelFields.map((field, index) => {
                const isCustomCa =
                  customCaSelected[`${fieldName}-steel-${index}`] || false;

                return (
                  <div key={field.id} className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.steel.${index}.ca`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">CA</FormLabel>
                          <FormControl>
                            {isCustomCa ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Outro"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCustomCaSelected((prev) => ({
                                      ...prev,
                                      [`${fieldName}-steel-${index}`]: false,
                                    }));
                                    field.onChange(caOptions[0]);
                                  }}
                                  className="text-xs"
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    setCustomCaSelected((prev) => ({
                                      ...prev,
                                      [`${fieldName}-steel-${index}`]: true,
                                    }));
                                    field.onChange(0);
                                  } else {
                                    field.onChange(Number(value));
                                  }
                                }}
                                value={field.value?.toString()}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="CA" />
                                </SelectTrigger>
                                <SelectContent>
                                  {caOptions.map((ca) => (
                                    <SelectItem
                                      key={ca}
                                      value={ca.toString()}
                                      disabled={isCaUsed(ca, index)}
                                    >
                                      {ca}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="custom">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`${fieldName}.steel.${index}.mass`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Massa (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSteel(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

  const renderFormsSection = () => {
    const formSlabs = form.watch("form_slabs") || 0;
    const formColumns = form.watch("form_columns") || 0;
    const formBeams = form.watch("form_beams") || 0;
    const totalFormArea = formSlabs + formColumns + formBeams;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Área de formas (opcional)
        </h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
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
                        type="number"
                        step="0.01"
                        placeholder="0,00"
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
                name="form_columns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de pilares (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
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
                name="form_beams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Forma de vigas (m²)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="text-xs">Total (m²)</FormLabel>
                <div className="flex items-center h-10 px-3 border border-input rounded-md bg-muted">
                  <span className="text-sm font-semibold">
                    {totalFormArea.toFixed(2)}
                  </span>
                </div>
              </FormItem>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderBlockSection()}
      {renderGroutSection()}
      {renderMortarSection()}
      {renderCompleteSection("concrete_slabs", "Laje de concreto", true)}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">
          Estrutura complementar (opcional)
        </h3>
        <div className="space-y-6">
          {renderCompleteSection(
            "concrete_columns",
            "Pilar de concreto",
            false
          )}
          {renderCompleteSection("concrete_beams", "Viga de concreto", false)}
        </div>
      </div>

      {renderFormsSection()}
    </div>
  );
};

export default ModuleFormStructuralMasonry;
