import { useTranslation } from "@/i18n";
import { masks } from "@/utils/masks";
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
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
}) => {
  const { t } = useTranslation();
  const { addMasonryBlock, removeMasonryBlock } = hooks;

  const blockFields = useFieldArray({
    control: form.control,
    name: "data.masonry.blocks",
  });

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
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.blocks}
          </h3>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
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
                <FormField
                  control={form.control}
                  name={`${fieldKey}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t.modules.form.blockType}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ?? BLOCK_TYPE_OPTIONS[0]}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          <SelectTrigger className="w-full h-9 text-xs">
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

                <div className="grid grid-cols-2 gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fbk`}
                    render={({ field }) => (
                      <FormItem>
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
                            <SelectTrigger className="w-full h-9 text-xs">
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
                                    Fbk {opt}
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

                  <div>
                    <FormField
                      control={form.control}
                      name={`${fieldKey}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.modules.form.blockQuantity}
                          </FormLabel>
                          <div className="flex gap-1">
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                className="h-9 text-xs"
                                placeholder="100"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const v = masks.numeric(e.target.value);
                                  field.onChange(v);
                                }}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMasonryBlock(index)}
                              disabled={items.length <= 0}
                              className="h-9 w-9 p-0 shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />
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
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="h-9 text-xs"
                            placeholder="20"
                            value={
                              typeof field.value === "number"
                                ? field.value
                                : (field.value ?? "")
                            }
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
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

          {items.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t.modules.form.totalQuantity}:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalQty.toLocaleString("pt-BR")} un
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MortarSection = ({
  form,
  hooks,
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
}) => {
  const { t } = useTranslation();
  const { addMasonryMortar, removeMasonryMortar } = hooks;

  const mortarFields = useFieldArray({
    control: form.control,
    name: "data.masonry.mortar",
  });

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
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.mortarSection}
          </h3>
        </div>

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
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
                <div className="grid grid-cols-2 gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`${fieldKey}.fak`}
                    render={({ field }) => (
                      <FormItem>
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
                            <SelectTrigger className="w-full h-9 text-xs">
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
                                    Fak {opt}
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

                  <div>
                    <FormField
                      control={form.control}
                      name={`${fieldKey}.volume`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.modules.form.volume}
                          </FormLabel>
                          <div className="flex gap-1">
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-9 text-xs"
                                placeholder="100"
                                value={field.value || ""}
                                onChange={(e) => {
                                  const v = masks.numeric(e.target.value);
                                  field.onChange(v);
                                }}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMasonryMortar(index)}
                              disabled={items.length <= 0}
                              className="h-9 w-9 p-0 shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </FormItem>
                      )}
                    />
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
                          <Input
                            type="number"
                            inputMode="decimal"
                            className="h-9 text-xs"
                            placeholder="15"
                            value={
                              typeof field.value === "number"
                                ? field.value
                                : (field.value ?? "")
                            }
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
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

          {items.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t.modules.form.totalConcreteVolume}:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalVol.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const GroutSection = ({
  form,
  hooks,
  stepperMode,
  isSubmitted,
}: {
  form: UseFormReturn<any>;
  hooks: MasonrySectionProps["hooks"];
  stepperMode?: boolean;
  isSubmitted?: boolean;
}) => {
  const { t } = useTranslation();
  const { addMasonryGrout, removeMasonryGrout } = hooks;

  const groutFields = useFieldArray({
    control: form.control,
    name: "data.masonry.grout",
  });

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
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {t.modules.form.groutSection}
          </h3>
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
          )}

          {groutFields.fields.map((_, groutIndex) => {
            const groutFieldKey = `data.masonry.grout.${groutIndex}`;
            const it = items[groutIndex];
            const position = it?.position ?? "vertical";

            const volFields = useFieldArray({
              control: form.control,
              name: `${groutFieldKey}.volumes` as const,
            });

            const volItems = (it?.volumes ?? []) as GroutVolumeItemForm[];

            return (
              <div
                key={(it as { id?: string })?.id ?? groutIndex}
                className="space-y-3 bg-white rounded-md border p-3"
              >
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
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {GROUT_POSITIONS.map((pos) => (
                                <SelectItem
                                  key={pos}
                                  value={pos}
                                  className="text-xs"
                                >
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
                    disabled={items.length <= 0}
                    className="h-9 w-9 p-0 shrink-0 self-end"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <FormLabel className="text-xs text-gray-500">
                    Volumes de graute
                  </FormLabel>
                  {volItems.length === 0 && (
                    <p className="text-xs text-muted-foreground italic px-1 py-1">
                      —
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
                        className="grid grid-cols-2 gap-2 items-end bg-gray-50 rounded border p-2"
                      >
                        <FormField
                          control={form.control}
                          name={`${fieldKey}.fgk`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                {t.modules.form.fgkLabel}
                              </FormLabel>
                              <FormControl>
                                <Select
                                  value={
                                    isCustom
                                      ? "other"
                                      : String(field.value ?? "")
                                  }
                                  onValueChange={(val) =>
                                    handleSelectFgk(groutIndex, volIndex, val)
                                  }
                                >
                                  <SelectTrigger className="w-full h-9 text-xs">
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
                                          Fgk {opt}
                                          {disabled
                                            ? ` ${t.modules.form.inUse}`
                                            : ""}
                                        </SelectItem>
                                      );
                                    })}
                                    <SelectItem
                                      value="other"
                                      className="text-xs"
                                    >
                                      {t.modules.form.other}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-1">
                          <FormField
                            control={form.control}
                            name={`${fieldKey}.volume`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-xs">
                                  {t.modules.form.volume}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    className="h-9 text-xs"
                                    placeholder="100"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const v = masks.numeric(e.target.value);
                                      field.onChange(v);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => volFields.remove(volIndex)}
                            disabled={volItems.length <= 0}
                            className="h-9 w-9 p-0 shrink-0 self-end"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        {isCustom && (
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name={`${fieldKey}.fgk`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    {t.modules.form.otherFgk}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      className="h-9 text-xs"
                                      placeholder="50"
                                      value={
                                        typeof field.value === "number"
                                          ? field.value
                                          : (field.value ?? "")
                                      }
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
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
                  allowedMaterials={["rebar", "strand", "other"]}
                  stepperMode={stepperMode}
                  isSubmitted={isSubmitted}
                  isRequiredPosition={false}
                />
              </div>
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

          {items.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                Volume total graute:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalVol.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                m³
              </span>
            </div>
          )}
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
}: MasonrySectionProps) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.completeness.masonryLabel}
        </h3>
      </div>
      <BlocksSection form={form} hooks={hooks} />
      <MortarSection form={form} hooks={hooks} />
      <GroutSection
        form={form}
        hooks={hooks}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
      />
    </div>
  );
};

export default MasonrySection;
