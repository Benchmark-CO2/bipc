import { useTranslation } from "@/i18n";
import { parseNumber } from "@/utils/numbers";
import { GROUT_POSITIONS } from "@/utils/modulePositions";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericStringInput } from "@/components/ui/numeric-string-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SteelMaterialList from "./steel-material-list";
import type { TBlockType, TGroutPosition } from "@/types/modules";
import type { UseFormReturn } from "react-hook-form";

const BLOCK_TYPE_OPTIONS: readonly TBlockType[] = [
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

const FBK_OPTIONS: readonly number[] = [3, 4.5, 6, 8, 10, 15];
const FGK_OPTIONS: readonly number[] = [10, 15, 20, 25, 30, 40];
const FAK_OPTIONS: readonly number[] = [2, 3, 4.5, 6, 8, 10];

type BlockItemForm = {
  type: TBlockType;
  fbk: number;
  quantity: string | number;
  customFbk?: boolean;
};

type MortarItemForm = {
  fak: number;
  volume: string | number;
  customFak?: boolean;
};

type GroutVolumeItemForm = {
  fgk: number;
  volume: string | number;
  customFgk?: boolean;
};

type MasonrySectionProps = {
  form: UseFormReturn<any>;
  hooks: {
    addMasonryBlock: () => void;
    removeMasonryBlock: (index: number) => void;
    addMasonryMortar: () => void;
    removeMasonryMortar: (index: number) => void;
    addMasonryGrout: (position?: TGroutPosition) => void;
    removeMasonryGrout: (index: number) => void;
  };
  stepperMode?: boolean;
  isSubmitted?: boolean;
};

const isOptionUsedInArray = <T extends number>(
  arr: Array<{ [k: string]: unknown }>,
  key: string,
  opts: readonly T[],
  value: T,
  currentIndex: number,
  customKey: string,
): boolean => {
  return arr.some((item, idx) => {
    if (idx === currentIndex) return false;
    if ((item as Record<string, unknown>)[customKey]) return false;
    const v = (item as Record<string, unknown>)[key];
    return Number(v) === value && opts.includes(value as T);
  });
};

const BlocksSection = ({
  form,
  hooks,
  blockFields,
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
  blockFields: ReturnType<
    typeof useFieldArray<any, "data.masonry.blocks", "id">
  >;
}) => {
  const { t } = useTranslation();
  const { addMasonryBlock, removeMasonryBlock } = hooks;

  const blocks = useWatch({
    control: form.control,
    name: "data.masonry.blocks",
    defaultValue: [],
  }) as BlockItemForm[] | undefined;
  const items = blocks ?? [];

  const [customFbkSelected, setCustomFbkSelected] = useState<
    Record<string, boolean>
  >({});

  const totalQty = useMemo(
    () =>
      items.reduce(
        (sum, b) => sum + (parseNumber(String(b.quantity || "0")) || 0),
        0,
      ),
    [items],
  );

  const handleSelectFbk = (index: number, rawValue: string) => {
    const fieldKey = `data.masonry.blocks.${index}`;
    if (rawValue === "other") {
      setCustomFbkSelected((prev) => ({ ...prev, [fieldKey]: true }));
      form.setValue(`${fieldKey}.customFbk`, true);
      const curr = Number(form.getValues(`${fieldKey}.fbk`) ?? 0);
      if (!curr || FBK_OPTIONS.includes(curr)) {
        form.setValue(`${fieldKey}.fbk`, 20);
      }
      return;
    }
    setCustomFbkSelected((prev) => ({ ...prev, [fieldKey]: false }));
    form.setValue(`${fieldKey}.fbk`, Number(rawValue));
    form.setValue(`${fieldKey}.customFbk`, false);
  };

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.blocks}
          </h3>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t.modules.form.totalQuantity}:
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalQty.toLocaleString("pt-BR")} un
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.blocks}
            </p>
          )}

          {blockFields.fields.map((_, index) => {
            const fieldKey = `data.masonry.blocks.${index}`;
            const it = items[index];
            const isCustom =
              customFbkSelected[fieldKey] ?? it?.customFbk ?? false;
            return (
              <div
                key={(it as { id?: string })?.id ?? index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.type`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">
                          {t.modules.form.blockType}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? BLOCK_TYPE_OPTIONS[0]}
                            onValueChange={(v) => field.onChange(v)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue
                                placeholder={t.modules.form.selectType}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_TYPE_OPTIONS.map((opt) => (
                                <SelectItem
                                  key={opt}
                                  value={opt}
                                  className="text-xs"
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fbk`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">
                          {t.modules.form.fbkLabel}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              isCustom ? "other" : String(field.value ?? "")
                            }
                            onValueChange={(val) => handleSelectFbk(index, val)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Selecione Fbk" />
                            </SelectTrigger>
                            <SelectContent>
                              {FBK_OPTIONS.map((opt) => {
                                const disabled = isOptionUsedInArray(
                                  items,
                                  "fbk",
                                  FBK_OPTIONS,
                                  opt,
                                  index,
                                  "customFbk",
                                );
                                return (
                                  <SelectItem
                                    key={opt}
                                    value={String(opt)}
                                    disabled={disabled}
                                    className="text-xs"
                                  >
                                    {opt}
                                    {disabled ? ` ${t.modules.form.inUse}` : ""}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem value="other" className="text-xs">
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
                    name={`${fieldKey}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-3">
                        <FormLabel className="text-xs">
                          {t.modules.form.blockQuantity}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={0}
                            allowNegative={false}
                            className="h-9 w-full max-w-[160px]"
                            placeholder="100"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMasonryBlock(index)}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {isCustom && (
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fbk`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.otherFbk}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={1}
                            allowNegative={false}
                            className="h-9"
                            placeholder="20"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMasonryBlock}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MortarSection = ({
  form,
  hooks,
  mortarFields,
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
  mortarFields: ReturnType<
    typeof useFieldArray<any, "data.masonry.mortar", "id">
  >;
}) => {
  const { t } = useTranslation();
  const { addMasonryMortar, removeMasonryMortar } = hooks;

  const mortar = useWatch({
    control: form.control,
    name: "data.masonry.mortar",
    defaultValue: [],
  }) as MortarItemForm[] | undefined;
  const items = mortar ?? [];

  const [customFakSelected, setCustomFakSelected] = useState<
    Record<string, boolean>
  >({});

  const totalVol = useMemo(
    () =>
      items.reduce(
        (sum, m) => sum + (parseNumber(String(m.volume || "0")) || 0),
        0,
      ),
    [items],
  );

  const handleSelectFak = (index: number, rawValue: string) => {
    const fieldKey = `data.masonry.mortar.${index}`;
    if (rawValue === "other") {
      setCustomFakSelected((prev) => ({ ...prev, [fieldKey]: true }));
      form.setValue(`${fieldKey}.customFak`, true);
      const curr = Number(form.getValues(`${fieldKey}.fak`) ?? 0);
      if (!curr || FAK_OPTIONS.includes(curr)) {
        form.setValue(`${fieldKey}.fak`, 15);
      }
      return;
    }
    setCustomFakSelected((prev) => ({ ...prev, [fieldKey]: false }));
    form.setValue(`${fieldKey}.fak`, Number(rawValue));
    form.setValue(`${fieldKey}.customFak`, false);
  };

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.mortarSection}
          </h3>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t.modules.form.totalConcreteVolume}:
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalVol.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.mortar}
            </p>
          )}

          {mortarFields.fields.map((_, index) => {
            const fieldKey = `data.masonry.mortar.${index}`;
            const it = items[index];
            const isCustom =
              customFakSelected[fieldKey] ?? it?.customFak ?? false;
            return (
              <div
                key={(it as { id?: string })?.id ?? index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fak`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-7">
                        <FormLabel className="text-xs">
                          {t.modules.form.fakLabel}
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={
                              isCustom ? "other" : String(field.value ?? "")
                            }
                            onValueChange={(val) => handleSelectFak(index, val)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Selecione Fak" />
                            </SelectTrigger>
                            <SelectContent>
                              {FAK_OPTIONS.map((opt) => {
                                const disabled = isOptionUsedInArray(
                                  items,
                                  "fak",
                                  FAK_OPTIONS,
                                  opt,
                                  index,
                                  "customFak",
                                );
                                return (
                                  <SelectItem
                                    key={opt}
                                    value={String(opt)}
                                    disabled={disabled}
                                    className="text-xs"
                                  >
                                    {opt}
                                    {disabled ? ` ${t.modules.form.inUse}` : ""}
                                  </SelectItem>
                                );
                              })}
                              <SelectItem value="other" className="text-xs">
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
                    name={`${fieldKey}.volume`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-4">
                        <FormLabel className="text-xs">
                          {t.modules.form.volume}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={4}
                            allowNegative={false}
                            className="h-9 w-full max-w-[160px]"
                            placeholder="100,00"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMasonryMortar(index)}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {isCustom && (
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fak`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.otherFak}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={1}
                            allowNegative={false}
                            className="h-9"
                            placeholder="15"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMasonryMortar}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface GroutItemRowProps {
  form: UseFormReturn<any>;
  groutIndex: number;
  groutFieldKey: string;
  item: {
    position?: TGroutPosition;
    volumes?: GroutVolumeItemForm[];
    steel?: unknown[];
  };
  removeMasonryGrout: (index: number) => void;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  customFgkSelected: Record<string, boolean>;
  onSelectFgk: (groutIndex: number, volIndex: number, rawValue: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}

const GroutItemRow = ({
  form,
  groutIndex,
  groutFieldKey,
  item,
  removeMasonryGrout,
  stepperMode,
  isSubmitted,
  customFgkSelected,
  onSelectFgk,
  t,
}: GroutItemRowProps) => {
  const position = item?.position ?? "vertical";
  const volFields = useFieldArray({
    control: form.control,
    name: `${groutFieldKey}.volumes` as const,
  });
  const volItems = (item?.volumes ?? []) as GroutVolumeItemForm[];

  const groutPositionLabel: Record<TGroutPosition, string> = {
    vertical: "Vertical",
    horizontal: "Horizontal",
  };

  return (
    <div className="space-y-3 bg-white rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <FormField
          control={form.control}
          name={`${groutFieldKey}.position`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="text-xs">
                {t.modules.form.groutType}
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? GROUT_POSITIONS[0]}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUT_POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos} className="text-xs">
                        {groutPositionLabel[pos]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeMasonryGrout(groutIndex)}
          className="h-9 w-9 p-0 shrink-0 self-end"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="space-y-3 p-3 rounded-md border-2 border-transparent">
        <div className="flex items-center justify-between">
          <FormLabel className="text-xs text-gray-700">
            Volumes de graute
          </FormLabel>
          {(() => {
            const volSum = volItems.reduce(
              (s, v) => s + parseNumber(String(v.volume || "0")),
              0,
            );
            if (volSum <= 0) return null;
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Total:</span>
                <span className="text-sm font-semibold tabular-nums text-gray-900">
                  {volSum.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  m³
                </span>
              </div>
            );
          })()}
        </div>
        {volItems.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1 py-1">
            {t.modules.form.emptyList.groutVolumes}
          </p>
        )}
        {volFields.fields.map((_, volIndex) => {
          const fieldKey = `${groutFieldKey}.volumes.${volIndex}`;
          const vit = volItems[volIndex];
          const isCustom =
            customFgkSelected[fieldKey] ?? vit?.customFgk ?? false;
          return (
            <div
              key={(vit as { id?: string })?.id ?? volIndex}
              className="space-y-3 bg-white rounded-md border p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <FormField
                  control={form.control}
                  name={`${fieldKey}.fgk`}
                  render={({ field }) => (
                    <FormItem className="col-span-12 sm:col-span-5">
                      <FormLabel className="text-xs">
                        {t.modules.form.fgkLabel}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={isCustom ? "other" : String(field.value ?? "")}
                          onValueChange={(val) =>
                            onSelectFgk(groutIndex, volIndex, val)
                          }
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Selecione Fgk" />
                          </SelectTrigger>
                          <SelectContent>
                            {FGK_OPTIONS.map((opt) => {
                              const disabled = isOptionUsedInArray(
                                volItems,
                                "fgk",
                                FGK_OPTIONS,
                                opt,
                                volIndex,
                                "customFgk",
                              );
                              return (
                                <SelectItem
                                  key={opt}
                                  value={String(opt)}
                                  disabled={disabled}
                                  className="text-xs"
                                >
                                  {opt}
                                  {disabled ? ` ${t.modules.form.inUse}` : ""}
                                </SelectItem>
                              );
                            })}
                            <SelectItem value="other" className="text-xs">
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
                  name={`${fieldKey}.volume`}
                  render={({ field }) => (
                    <FormItem className="col-span-12 sm:col-span-6">
                      <FormLabel className="text-xs">
                        {t.modules.form.volume}
                      </FormLabel>
                      <FormControl>
                        <NumericStringInput
                          {...field}
                          decimalPlaces={4}
                          allowNegative={false}
                          className="h-9 w-full max-w-[160px]"
                          placeholder="100,00"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="col-span-12 sm:col-span-1 flex sm:items-end sm:pb-[2px]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => volFields.remove(volIndex)}
                    className="h-9 w-9 p-0 shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {isCustom && (
                <FormField
                  control={form.control}
                  name={`${fieldKey}.fgk`}
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel className="text-xs">
                        {t.modules.form.otherFgk}
                      </FormLabel>
                      <FormControl>
                        <NumericStringInput
                          {...field}
                          decimalPlaces={1}
                          allowNegative={false}
                          className="h-9"
                          placeholder="50"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            volFields.append({
              fgk: FGK_OPTIONS[0] ?? 20,
              volume: "0",
              customFgk: false,
            } as never)
          }
          className="w-full text-green-600 border-green-600 hover:bg-green-50"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-t border-gray-200" />

      <SteelMaterialList
        form={form}
        name={`${groutFieldKey}.steel`}
        allowedMaterials={["rebar", "strand", "general", "other"]}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        isRequiredPosition={false}
        positions={GROUT_POSITIONS}
        firstPosition={position}
        emptyLabel={t.modules.form.emptyList.groutSteel}
      />
    </div>
  );
};

const GroutSection = ({
  form,
  hooks,
  stepperMode,
  isSubmitted,
  groutFields,
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
  stepperMode?: boolean;
  isSubmitted?: boolean;
  groutFields: ReturnType<
    typeof useFieldArray<any, "data.masonry.grout", "id">
  >;
}) => {
  const { t } = useTranslation();
  const { addMasonryGrout, removeMasonryGrout } = hooks;

  const grout = useWatch({
    control: form.control,
    name: "data.masonry.grout",
    defaultValue: [],
  }) as
    | Array<{
        position?: TGroutPosition;
        volumes?: GroutVolumeItemForm[];
        steel?: unknown[];
      }>
    | undefined;
  const items = grout ?? [];

  const [customFgkSelected, setCustomFgkSelected] = useState<
    Record<string, boolean>
  >({});

  const groutPositionLabel: Record<TGroutPosition, string> = {
    vertical: "Vertical",
    horizontal: "Horizontal",
  };

  const totalVol = useMemo(
    () =>
      items.reduce((sum, g) => {
        const vSum = (g.volumes ?? []).reduce(
          (s, v) => s + (parseNumber(String(v.volume || "0")) || 0),
          0,
        );
        return sum + vSum;
      }, 0),
    [items],
  );

  const handleSelectFgk = (
    groutIndex: number,
    volIndex: number,
    rawValue: string,
  ) => {
    const fieldKey = `data.masonry.grout.${groutIndex}.volumes.${volIndex}`;
    if (rawValue === "other") {
      setCustomFgkSelected((prev) => ({ ...prev, [fieldKey]: true }));
      form.setValue(`${fieldKey}.customFgk`, true);
      const curr = Number(form.getValues(`${fieldKey}.fgk`) ?? 0);
      if (!curr || FGK_OPTIONS.includes(curr)) {
        form.setValue(`${fieldKey}.fgk`, 50);
      }
      return;
    }
    setCustomFgkSelected((prev) => ({ ...prev, [fieldKey]: false }));
    form.setValue(`${fieldKey}.fgk`, Number(rawValue));
    form.setValue(`${fieldKey}.customFgk`, false);
  };

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.groutSection}
          </h3>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Volume total graute:
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {totalVol.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">
              {t.modules.form.emptyList.groutVolumes}
            </p>
          )}

          {groutFields.fields.map((_, groutIndex) => {
            const groutFieldKey = `data.masonry.grout.${groutIndex}`;
            const it = items[groutIndex];
            return (
              <GroutItemRow
                key={(it as { id?: string })?.id ?? groutIndex}
                form={form}
                groutIndex={groutIndex}
                groutFieldKey={groutFieldKey}
                item={it}
                removeMasonryGrout={removeMasonryGrout}
                stepperMode={stepperMode}
                isSubmitted={isSubmitted}
                customFgkSelected={customFgkSelected}
                onSelectFgk={handleSelectFgk}
                t={t}
              />
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addMasonryGrout()}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" /> {t.modules.form.addGrout}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MasonrySection = ({
  form,
  hooks,
  stepperMode,
  isSubmitted,
  masonryBlocksArray,
  masonryMortarArray,
  masonryGroutArray,
}: MasonrySectionProps & {
  masonryBlocksArray: ReturnType<
    typeof useFieldArray<any, "data.masonry.blocks", "id">
  >;
  masonryMortarArray: ReturnType<
    typeof useFieldArray<any, "data.masonry.mortar", "id">
  >;
  masonryGroutArray: ReturnType<
    typeof useFieldArray<any, "data.masonry.grout", "id">
  >;
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.completeness.masonryLabel}
        </h3>
      </div>
      <BlocksSection
        form={form}
        hooks={hooks}
        blockFields={masonryBlocksArray}
      />
      <MortarSection
        form={form}
        hooks={hooks}
        mortarFields={masonryMortarArray}
      />
      <GroutSection
        form={form}
        hooks={hooks}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        groutFields={masonryGroutArray}
      />
    </div>
  );
};

export default MasonrySection;
