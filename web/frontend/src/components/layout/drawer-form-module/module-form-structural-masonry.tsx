import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { useTranslation } from "@/i18n";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
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

interface ModuleFormStructuralMasonryProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  source?: ModuleFormSource;
}

interface GroutItemProps {
  groutIndex: number;
  groutField: any;
  form: UseFormReturn<ModuleFormState>;
  groutTypes: Array<{ value: string; label: string }>;
  isGroutTypeUsed: (groutType: string, currentIndex: number) => boolean;
  onRemove: () => void;
  canRemove: boolean;
  fgkOptions: number[];
  customFgkSelected: Record<string, boolean>;
  setCustomFgkSelected: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  isRequiredPosition?: boolean;
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
  customFgkSelected,
  setCustomFgkSelected,
  stepperMode = false,
  isSubmitted = false,
  isRequiredPosition = false,
}: GroutItemProps) => {
  const { t } = useTranslation();
  const volumesFieldArray = useFieldArray({
    control: form.control,
    name: `grout.${groutIndex}.volumes`,
  });

  const volumes = form.watch(`grout.${groutIndex}.volumes`) || [];

  const totalVolume = volumes.reduce(
    (sum: number, item: any) => sum + parseNumber(item.volume || "0"),
    0,
  );

  return (
    <Card key={groutField.id} className="border-2 border-blue-500">
      <CardContent className="space-y-4">
        {/* Header com tipo e botão remover */}
        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name={`grout.${groutIndex}.position`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-xs font-medium">
                  {t.modules.form.groutType}
                  <RequiredAsterisk />
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t.modules.form.selectType} />
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

        <div className="border-t border-gray-200 my-4"></div>

        {/* Volumes Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-1">
            <FormLabel className="text-xs text-gray-700">
              {t.modules.form.groutSection}
              <RequiredAsterisk />
            </FormLabel>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Total:</span>
              <span className="text-sm font-semibold text-gray-900">
                {totalVolume.toInternational(undefined, 2)} m³
              </span>
            </div>
          </div>

          {volumesFieldArray.fields.map((volumeField, volumeIndex) => {
            const currentFgk = form.watch(
              `grout.${groutIndex}.volumes.${volumeIndex}.fgk`,
            );
            const isCustomFgk =
              customFgkSelected[`grout-${groutIndex}-volume-${volumeIndex}`] ||
              (currentFgk && !fgkOptions.includes(currentFgk));

            return (
              <div
                key={volumeField.id}
                className="border border-gray-200 rounded-md p-3 space-y-3"
              >
                <div className="flex items-end gap-2">
                  {!isCustomFgk ? (
                    <FormField
                      control={form.control}
                      name={`grout.${groutIndex}.volumes.${volumeIndex}.fgk`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">
                            {t.modules.form.fgkLabel}
                            <RequiredAsterisk />
                          </FormLabel>
                          <FormControl>
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
                                  setCustomFgkSelected((prev) => ({
                                    ...prev,
                                    [`grout-${groutIndex}-volume-${volumeIndex}`]:
                                      false,
                                  }));
                                  field.onChange(Number(value));
                                }
                              }}
                              value={field.value?.toString()}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Fgk" />
                              </SelectTrigger>
                              <SelectContent>
                                {fgkOptions.map((fgk) => (
                                  <SelectItem key={fgk} value={fgk.toString()}>
                                    {fgk}
                                  </SelectItem>
                                ))}
                                <SelectItem value="custom">
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
                      control={form.control}
                      name={`grout.${groutIndex}.volumes.${volumeIndex}.fgk`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">
                            {t.modules.form.otherFgk}
                            <RequiredAsterisk />
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="35"
                              value={field.value || ""}
                              onChange={(e) => {
                                const numericValue = masks.numeric(
                                  e.target.value,
                                );
                                field.onChange(Number(numericValue) || 0);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name={`grout.${groutIndex}.volumes.${volumeIndex}.volume`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">
                          {t.modules.form.volume}
                          <RequiredAsterisk />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="0.00"
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(masks.numeric(e.target.value))
                            }
                          />
                        </FormControl>
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
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
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
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {/* Steel Section - usando SteelMaterialList */}
        <SteelMaterialList
          form={form}
          name={`grout.${groutIndex}.steel`}
          allowedMaterials={["rebar", "mesh", "strand", "other"]}
          stepperMode={stepperMode}
          isSubmitted={isSubmitted}
          isRequiredPosition={isRequiredPosition}
        />
      </CardContent>
    </Card>
  );
};

const STRUCTURAL_MASONRY_POSITION_LABEL: Record<string, string> = {
  concrete_columns: "column",
  concrete_beams: "beam",
  concrete_slabs: "slab",
};

const ModuleFormStructuralMasonry = ({
  form,
  stepperMode = false,
  isSubmitted = false,
  source = "default",
}: ModuleFormStructuralMasonryProps) => {
  const { t } = useTranslation();
  const slabTypeOptions = useSlabTypeOptions();
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const fbkOptions = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26];
  const fgkOptions = [15, 20, 25, 30];
  const fakOptions = [4.5, 8, 14];

  useUnspecifiedDataInit(form as any);

  const isAggregatedInputMode = source === "ifc" || source === "tqs";

  const aggregatedTitle =
    source === "ifc"
      ? (t.modules.form.ifcSourceLabel ?? "Materiais (IFC)")
      : source === "tqs"
        ? (t.modules.form.tqsSourceLabel ?? "Materiais (TQS)")
        : undefined;

  const blockTypes = [
    "inteiro (14x19x29)",
    "meio (14x19x14)",
    "amarração T (14x19x44)",
    "canaleta inteira (14x19x29)",
    "meia canaleta (14x19x14)",
    "inteiro (14x19x39)",
    "meio (14x19x19)",
    "amarração T (14x19x54)",
    "amarração L (14x19x34)",
    "canaleta  inteira (14x19x39)",
    "canaleta de amarração (14x19x34)",
    "meia canaleta (14x19x19)",
    "compensador 1/4 (14x19x9)",
    "compensador 1/8 (14x19x4)",
    "inteiro (19x19x39)",
    "meio (19x19x19)",
    "canaleta inteira (19x19x39)",
    "meia canaleta (19x19x19)",
    "compensador 1/4 (19x19x9)",
    "compensador 1/8 (19x19x4)",
  ] as const;

  const [customFckSelected, setCustomFckSelected] = useState<
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
          { material: "rebar", resistance: "CA50", mass: 0 },
        ]);
      }
    });

    const blocks = form.getValues("masonry_blocks");
    const grout = form.getValues("grout");
    const mortar = form.getValues("mortar");

    if (!blocks || blocks.length === 0) {
      form.setValue("masonry_blocks", [
        { type: "inteiro (14x19x29)" as const, fbk: 6, quantity: 0 },
      ]);
    }

    if (!grout || grout.length === 0) {
      form.setValue("grout", [
        {
          position: "vertical" as const,
          volumes: [{ fgk: 20, volume: 0 }],
          steel: [
            {
              material: "rebar" as const,
              resistance: "CA50" as const,
              mass: 0,
              position: "vertical",
            },
          ],
        },
      ]);
    }

    if (!mortar || mortar.length === 0) {
      form.setValue("mortar", [{ fak: 4.5, volume: 0 }]);
    }

    const formSlabs = form.getValues("form_slabs");

    if (formSlabs === undefined) {
      form.setValue("form_slabs", "0");
    }
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

  const calculateTotalQuantity = (
    blocks: Array<{ type: string; fbk: number; quantity: string | number }>,
  ) => {
    return (
      blocks?.reduce((total, item) => {
        const quantity =
          typeof item.quantity === "string"
            ? parseNumber(item.quantity)
            : item.quantity || 0;
        return total + quantity;
      }, 0) || 0
    );
  };

  const calculateTotalMortarVolume = (
    mortar: Array<{ fak: number; volume: string | number }>,
  ) => {
    return (
      mortar?.reduce((total, item) => {
        const volume =
          typeof item.volume === "string"
            ? parseNumber(item.volume)
            : item.volume || 0;
        return total + volume;
      }, 0) || 0
    );
  };

  const renderBlockSection = () => {
    const {
      fields: blockFields,
      append: appendBlock,
      remove: removeBlock,
    } = useFieldArray({
      control: form.control,
      name: "masonry_blocks",
    });

    useWatch({ control: form.control, name: "masonry_blocks" });
    const currentBlocks = form.getValues("masonry_blocks") || [];

    const isBlockTypeUsed = (blockType: string, currentIndex: number) => {
      return currentBlocks.some(
        (block: any, index: number) =>
          index !== currentIndex && block.type === blockType,
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
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.blocks}
          <RequiredAsterisk />
        </h3>

        <Card className="border-2 border-blue-500">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                {t.modules.form.totalQuantity}
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalQuantity.toInternational(undefined, 0)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {blockFields.map((field, index) => {
                const currentFbk = form.watch(`masonry_blocks.${index}.fbk`);
                const isCustomFbk =
                  customFbkSelected[`block-${index}`] ||
                  (currentFbk && !fbkOptions.includes(currentFbk));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`masonry_blocks.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              {t.modules.form.blockType}
                              <RequiredAsterisk />
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={t.modules.form.selectType}
                                  />
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
                          </FormItem>
                        )}
                      />

                      {!isCustomFbk ? (
                        <FormField
                          control={form.control}
                          name={`masonry_blocks.${index}.fbk`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.blockFbk}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(value) => {
                                    if (value === "custom") {
                                      setCustomFbkSelected((prev) => ({
                                        ...prev,
                                        [`block-${index}`]: true,
                                      }));
                                      field.onChange(0);
                                    } else {
                                      setCustomFbkSelected((prev) => ({
                                        ...prev,
                                        [`block-${index}`]: false,
                                      }));
                                      field.onChange(Number(value));
                                    }
                                  }}
                                  value={field.value?.toString()}
                                >
                                  <SelectTrigger className="w-full">
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
                                    <SelectItem value="custom">
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
                          control={form.control}
                          name={`masonry_blocks.${index}.fbk`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.otherFbk}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="70"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const numericValue = masks.numeric(
                                      e.target.value,
                                    );
                                    field.onChange(Number(numericValue) || 0);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name={`masonry_blocks.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              {t.modules.form.blockQuantity}
                              <RequiredAsterisk />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0"
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(masks.numeric(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBlock(index)}
                        className="shrink-0"
                        disabled={blockFields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
                appendBlock({
                  type: getNextAvailableBlockType(),
                  fbk: 6,
                  quantity: 0,
                })
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
              disabled={blockFields.length === blockTypes.length}
            >
              <Plus className="h-4 w-4" />
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
    ];

    const isGroutTypeUsed = (groutType: string, currentIndex: number) => {
      return currentGrout.some(
        (grout: any, index: number) =>
          index !== currentIndex && grout.type === groutType,
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
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.groutSection}
          <RequiredAsterisk />
        </h3>

        <div className="space-y-3">
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
              customFgkSelected={customFgkSelected}
              setCustomFgkSelected={setCustomFgkSelected}
              stepperMode={stepperMode}
              isSubmitted={isSubmitted}
              isRequiredPosition={true}
            />
          ))}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextPos = getNextAvailableGroutType() as any;
                appendGrout({
                  position: nextPos,
                  volumes: [{ fgk: 20, volume: 0 }],
                  steel: [
                    {
                      material: "rebar" as any,
                      resistance: "CA50" as any,
                      mass: 0,
                      position: nextPos,
                    },
                  ],
                });
              }}
              className="ml-auto text-green-600 border-green-600 hover:bg-green-50"
              disabled={groutFields.length >= 3}
            >
              {t.modules.form.addGrout}
            </Button>
          </div>
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
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.mortarSection}
          <RequiredAsterisk />
        </h3>

        <Card className="border-2 border-blue-500">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                {t.modules.form.volume.replace("(m³)", "")} total (m³)
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalVolume.toInternational(undefined, 2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {mortarFields.map((field, index) => {
                const currentFak = form.watch(`mortar.${index}.fak`);
                const isCustomFak =
                  customFakSelected[`mortar-${index}`] ||
                  (currentFak && !fakOptions.includes(currentFak));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="flex items-end gap-2">
                      {!isCustomFak ? (
                        <FormField
                          control={form.control}
                          name={`mortar.${index}.fak`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.fakLabel}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(value) => {
                                    if (value === "custom") {
                                      setCustomFakSelected((prev) => ({
                                        ...prev,
                                        [`mortar-${index}`]: true,
                                      }));
                                      field.onChange(0);
                                    } else {
                                      setCustomFakSelected((prev) => ({
                                        ...prev,
                                        [`mortar-${index}`]: false,
                                      }));
                                      field.onChange(Number(value));
                                    }
                                  }}
                                  value={field.value?.toString()}
                                >
                                  <SelectTrigger className="w-full">
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
                                    ))}{" "}
                                    <SelectItem value="custom">
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
                          control={form.control}
                          name={`mortar.${index}.fak`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.otherFak}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="10"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const numericValue = masks.numeric(
                                      e.target.value,
                                    );
                                    field.onChange(Number(numericValue) || 0);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name={`mortar.${index}.volume`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              {t.modules.form.volume}
                              <RequiredAsterisk />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(masks.numeric(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMortar(index)}
                        className="shrink-0"
                        disabled={mortarFields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
                appendMortar({
                  fak: 5,
                  volume: 0,
                })
              }
              className="w-full text-green-600 border-green-600 hover:bg-green-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
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

    const position = STRUCTURAL_MASONRY_POSITION_LABEL[fieldName];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.structural_masonry.includes(position);

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
    useWatch({ control: form.control, name: `${fieldName}.steel` as any });
    const currentVolumes = form.getValues(`${fieldName}.volumes` as any) || [];
    const currentSteel = form.getValues(`${fieldName}.steel` as any) || [];

    // Validação para campos opcionais usando useMemo
    const sectionWarning = useMemo(() => {
      if (!isRequired) {
        const hasVolumes = currentVolumes.length > 0;
        const hasSteel = currentSteel.length > 0;
        const hasVolumeWithValue = currentVolumes.some(
          (v: any) => v.volume > 0,
        );
        const hasSteelWithValue = currentSteel.some((s: any) => s.mass > 0);

        if ((hasVolumes || hasVolumeWithValue) && !hasSteel) {
          return t.modules.form.warningConcreteNoSteel;
        } else if ((hasSteel || hasSteelWithValue) && !hasVolumes) {
          return t.modules.form.warningSteelNoConcrete;
        } else if (
          hasVolumes &&
          hasSteel &&
          !hasVolumeWithValue &&
          hasSteelWithValue
        ) {
          return t.modules.form.warningConcreteZero;
        } else if (
          hasVolumes &&
          hasSteel &&
          hasVolumeWithValue &&
          !hasSteelWithValue
        ) {
          return t.modules.form.warningSteelZero;
        } else if (
          hasVolumes &&
          hasSteel &&
          !hasVolumeWithValue &&
          !hasSteelWithValue
        ) {
          return t.modules.form.warningBothZero;
        }
      }
      return "";
    }, [currentVolumes, currentSteel, isRequired]);

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

        {/* Warning para campos opcionais */}
        {!isRequired && sectionWarning && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {sectionWarning}
            </AlertDescription>
          </Alert>
        )}

        <Card className={`border-2 ${borderColor}`}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 px-1">
              <FormLabel className="text-xs text-gray-500">
                {t.modules.form.totalConcreteVolume}
              </FormLabel>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {totalVolume.toInternational(undefined, 2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {volumeFields.map((field, index) => {
                const currentFck = form.watch(
                  `${fieldName}.volumes.${index}.fck` as any,
                );
                const isCustomFck =
                  customFckSelected[`${fieldName}-volume-${index}`] ||
                  (currentFck && !fckOptions.includes(currentFck));

                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="flex items-end gap-2">
                      {!isCustomFck ? (
                        <FormField
                          control={form.control}
                          name={`${fieldName}.volumes.${index}.fck`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.fckLabel}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={(value) => {
                                    if (value === "custom") {
                                      setCustomFckSelected((prev) => ({
                                        ...prev,
                                        [`${fieldName}-volume-${index}`]: true,
                                      }));
                                      field.onChange(0);
                                    } else {
                                      setCustomFckSelected((prev) => ({
                                        ...prev,
                                        [`${fieldName}-volume-${index}`]: false,
                                      }));
                                      field.onChange(Number(value));
                                    }
                                  }}
                                  value={field.value?.toString()}
                                >
                                  <SelectTrigger className="w-full">
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
                                    <SelectItem value="custom">
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
                          control={form.control}
                          name={`${fieldName}.volumes.${index}.fck`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">
                                {t.modules.form.otherFck}
                                <RequiredAsterisk />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="70"
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const numericValue = masks.numeric(
                                      e.target.value,
                                    );
                                    field.onChange(Number(numericValue) || 0);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name={`${fieldName}.volumes.${index}.volume`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">
                              {t.modules.form.volume}
                              <RequiredAsterisk />
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(masks.numeric(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeVolume(index)}
                        className="shrink-0"
                        disabled={isRequired && volumeFields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
              allowedMaterials={["rebar", "mesh", "strand", "other"]}
              stepperMode={stepperMode}
              isSubmitted={isSubmitted}
              isRequiredPosition={isRequired}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFormsSection = () => {
    const formSlabs = form.watch("form_slabs") || "0";
    const formColumns = form.watch("form_columns") || "0";
    const formBeams = form.watch("form_beams") || "0";
    const totalFormArea =
      parseNumber(formSlabs) +
      parseNumber(formColumns) +
      parseNumber(formBeams);

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary dark:text-gray-300">
          {t.modules.form.formAreaOptional}
        </h3>

        <Card className="border-2 border-gray-300">
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 items-end">
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
                        placeholder="0,00"
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
                name="form_columns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t.modules.form.formColumns}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0,00"
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
                        placeholder="0,00"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(masks.numeric(e.target.value))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="text-xs">
                  {t.modules.form.totalForm}
                </FormLabel>
                <div className="flex items-center h-10 px-3 border border-input rounded-md bg-muted">
                  <span className="text-sm font-semibold">
                    {totalFormArea.toInternational(undefined, 2)}
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
      {!isAggregatedInputMode ? (
        <RequiredLegend legend={t.modules.form.requiredLegend} />
      ) : null}

      {/* Badge FONTE (apenas IFC/TQS) */}
      {isAggregatedInputMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <RequiredFieldBadge variant="ifc" source={source} />
        </div>
      )}

      {/* TODO: Campos Extras OpenAPI (escalares, sempre visíveis) */}
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

      <div className="grid grid-cols-2 gap-4 items-end">
        <FormField
          control={form.control}
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
          name="slab_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                {t.modules.form.slabCount}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="1"
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

      {/* Masonry (blocks, grout, mortar): SEMPRE visíveis (required por schema OpenAPI) */}
      {renderBlockSection()}
      {renderGroutSection()}
      {renderMortarSection()}

      {/* Cards de position concrete/steel: só default (laje, pilares, vigas complementares + formas) */}
      {!isAggregatedInputMode && (
        <>
          {renderCompleteSection(
            "concrete_slabs",
            t.modules.form.concreteSlab,
            true,
          )}

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-primary dark:text-gray-300">
              {t.modules.form.complementaryStructure}
            </h3>
            <div className="space-y-6">
              {renderCompleteSection(
                "concrete_columns",
                t.modules.form.concreteColumn,
                false,
              )}
              {renderCompleteSection(
                "concrete_beams",
                t.modules.form.concreteBeam,
                false,
              )}
            </div>
          </div>

          {renderFormsSection()}
        </>
      )}

      {/* Sem Posição / Geral (sempre visível, no modo ifc/tqs é o único de concrete/steel) */}
      <UnspecifiedCard
        form={form as any}
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

export default ModuleFormStructuralMasonry;
