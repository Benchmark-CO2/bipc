import { useWatch } from "react-hook-form";
import { useTranslation } from "@/i18n";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useMemo } from "react";
import { Control, UseFormReturn } from "react-hook-form";
import { TFck } from "@/types/modules";
import { parseNumber } from "@/utils/numbers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NumericStringInput } from "@/components/ui/numeric-string-input";
import SteelMaterialList from "./steel-material-list";

export interface IUnspecifiedConcreteVolumeRow {
  fck: TFck | number | string | "";
  volume: string | number;
  customFck?: boolean;
}

export const useUnspecifiedDataInit = <
  TForm extends {
    unspecified?: {
      volumes?: unknown[];
      steel?: unknown[];
    };
  } = any,
>(
  form: UseFormReturn<TForm>,
  defaultSteel = [
    { material: "rebar", resistance: "CA50", mass: "0" },
  ] as unknown as NonNullable<TForm["unspecified"]>["steel"],
) => {
  useEffect(() => {
    const currentUnspecified = form.getValues("unspecified" as any);
    if (!currentUnspecified) {
      form.setValue(
        "unspecified" as any,
        {
          volumes: [] as unknown[],
          steel: (defaultSteel ?? []) as unknown[],
        } as any,
        { shouldValidate: false },
      );
    } else {
      if (!currentUnspecified.volumes) {
        form.setValue("unspecified.volumes" as any, [] as any, {
          shouldValidate: false,
        });
      }
      if (!currentUnspecified.steel || currentUnspecified.steel.length === 0) {
        form.setValue("unspecified.steel" as any, (defaultSteel ?? []) as any, {
          shouldValidate: false,
        });
      }
    }
  }, [form, defaultSteel]);
};

export interface UnspecifiedCardProps<TForm extends object = any> {
  form: UseFormReturn<TForm>;
  fckOptions: { label: string; value: string }[] | number[];
  customFckSelectedGlobal: Record<string, boolean>;
  setCustomFckSelectedGlobal: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  onSelectOtherFck?: () => void;
  concreteRootKey?: keyof TForm | string;
  steelRootKey?: keyof TForm | string;
  formAreaKey?: keyof TForm | string;
  isSteelRequired?: boolean;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  allowedMaterials?: ("rebar" | "strand" | "mesh" | "other")[];
  title?: string;
  hint?: string;
  allowedPositions?: readonly { value: string; label: string }[];
  defaultPosition?: string;
}

const UnspecifiedCardInner = <TForm extends object = any>(
  props: UnspecifiedCardProps<TForm>,
) => {
  const { t } = useTranslation();
  const {
    form,
    fckOptions,
    customFckSelectedGlobal,
    setCustomFckSelectedGlobal,
    concreteRootKey = "unspecified.volumes",
    steelRootKey = "unspecified.steel",
    formAreaKey,
    isSteelRequired = false,
    stepperMode = false,
    isSubmitted = false,
    allowedMaterials = ["rebar", "strand", "other"],
    title,
    hint,
    allowedPositions,
    defaultPosition,
  } = props;

  const concreteRootKeyStr = String(concreteRootKey);
  const steelRootKeyStr = String(steelRootKey);

  const volumes = useWatch({
    control: form.control as unknown as Control,
    name: concreteRootKeyStr as any,
    defaultValue: [],
  }) as IUnspecifiedConcreteVolumeRow[];

  const setVolumes = (
    setter: (
      prev: IUnspecifiedConcreteVolumeRow[],
    ) => IUnspecifiedConcreteVolumeRow[],
  ) => {
    const current = (form.getValues(concreteRootKeyStr as any) ??
      []) as IUnspecifiedConcreteVolumeRow[];
    form.setValue(concreteRootKeyStr as any, setter(current) as any, {
      shouldDirty: true,
    });
  };

  const fckOptionsPlain = useMemo(
    () =>
      (Array.isArray(fckOptions) && typeof fckOptions[0] === "number"
        ? (fckOptions as number[])
        : (fckOptions as { label: string; value: string }[]).map((o) =>
            Number(o.value),
          )
      ).filter((n) => !isNaN(n)),
    [fckOptions],
  );

  const isFckUsed = (fck: number, currentIndex: number): boolean => {
    return volumes.some(
      (volume, index) =>
        index !== currentIndex &&
        Number(volume.fck) === fck &&
        fckOptionsPlain.includes(fck),
    );
  };

  const getNextAvailableFck = (): TFck => {
    const usedFcks = volumes
      .map((volume) => Number(volume.fck))
      .filter((fck) => fckOptionsPlain.includes(fck));
    const next =
      fckOptionsPlain.find((fck) => !usedFcks.includes(fck)) ||
      fckOptionsPlain[0];
    return (next || 25) as TFck;
  };

  const addVolume = () => {
    setVolumes((prev) => [
      ...prev,
      { fck: getNextAvailableFck(), volume: "", customFck: false },
    ]);
  };

  const removeVolume = (index: number) => {
    setVolumes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectFck = (index: number, rawValue: string) => {
    const fieldKey = `${concreteRootKeyStr}.${index}`;
    if (rawValue === "other") {
      setCustomFckSelectedGlobal((prev) => ({
        ...prev,
        [fieldKey]: true,
      }));
      form.setValue(`${fieldKey}.customFck` as any, true as any);
      const currentFck = Number(form.getValues(`${fieldKey}.fck` as any) ?? 0);
      if (!currentFck || fckOptionsPlain.includes(currentFck)) {
        form.setValue(`${fieldKey}.fck` as any, 70 as any);
      }
      return;
    }
    const n = Number(rawValue);
    setCustomFckSelectedGlobal((prev) => ({
      ...prev,
      [fieldKey]: false,
    }));
    form.setValue(`${fieldKey}.fck` as any, n as any);
    form.setValue(`${fieldKey}.customFck` as any, false as any);
  };

  const totalVolume = volumes.reduce(
    (sum, v) => sum + parseNumber(String(v.volume || "0")),
    0,
  );

  const hasVolumes = volumes.length > 0;
  const steelArr = (form.getValues(steelRootKeyStr as any) ?? []) as any[];
  const hasSteelItems = steelArr.some((s) => {
    const mass = parseNumber(String(s.mass || "0"));
    return mass > 0 || s.material !== "rebar" || s.resistance !== "CA50";
  });

  if (!isSteelRequired && !hasVolumes && !hasSteelItems) {
    return null;
  }

  const fckOptionsMapped = (
    Array.isArray(fckOptions) && typeof fckOptions[0] === "number"
      ? (fckOptions as number[]).map((n) => ({
          label: `fck ${n}`,
          value: String(n),
        }))
      : (fckOptions as { label: string; value: string }[])
  ) as { label: string; value: string }[];

  const isInvalidPosition = (posRaw: string | null | undefined): boolean => {
    if (!allowedPositions || allowedPositions.length === 0) return false;
    if (!posRaw || typeof posRaw !== "string") return false;
    const normalized = posRaw.trim().toLowerCase();
    if (
      normalized === "" ||
      normalized === "unspecified" ||
      normalized === "geral"
    )
      return false;
    return !allowedPositions.some(
      (ap) => ap.value.toLowerCase() === normalized,
    );
  };

  const firstInvalidPosition = (): string | null => {
    const first = volumes.find((v) =>
      isInvalidPosition(
        (v as unknown as { position?: string | null | undefined }).position,
      ),
    );
    if (!first) return null;
    return (
      (first as unknown as { position?: string | null | undefined }).position ??
      null
    );
  };

  return (
    <Card className="p-0 space-y-0 border border-gray-300 bg-gray-50/50">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary dark:text-gray-200">
            {title ?? t.modules.form.unspecifiedPosition}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hint ?? t.modules.form.unspecifiedHint}
          </p>
        </div>

        {allowedPositions && allowedPositions.length > 0 && (
          <FormField
            control={form.control as Control<any>}
            name={`${concreteRootKeyStr}.0.position` as any}
            render={({ field }) => {
              const currentPosition =
                field.value ??
                defaultPosition ??
                allowedPositions[0]?.value ??
                null;
              const invalid = isInvalidPosition(currentPosition);
              const invalidPosValue =
                (invalid ? currentPosition : firstInvalidPosition()) ?? "";
              const acceptedList = allowedPositions
                .map((a) => a.value)
                .join(", ");
              return (
                <FormItem>
                  <FormLabel className="text-xs">Posição</FormLabel>
                  <FormControl>
                    <div className="relative w-full">
                      <Select
                        value={
                          field.value ??
                          defaultPosition ??
                          allowedPositions[0]?.value
                        }
                        onValueChange={(val) => {
                          volumes.forEach((_, i) => {
                            form.setValue(
                              `${concreteRootKeyStr}.${i}.position` as any,
                              val as any,
                            );
                          });
                          const steelArr = (form.getValues(
                            steelRootKeyStr as any,
                          ) ?? []) as any[];
                          steelArr.forEach((_, i) => {
                            form.setValue(
                              `${steelRootKeyStr}.${i}.position` as any,
                              val as any,
                            );
                          });
                          field.onChange(val);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-full h-9 text-xs",
                            invalid ? "pr-9" : "",
                          )}
                        >
                          <SelectValue placeholder="Selecione a posição" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedPositions.map((pos) => (
                            <SelectItem
                              key={pos.value}
                              value={pos.value}
                              className="text-xs"
                            >
                              {pos.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {invalid && (
                        <TooltipProvider
                          disableHoverableContent
                          delayDuration={150}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center text-amber-600 dark:text-amber-400 pointer-events-none"
                                role="img"
                                aria-label={t.modules.warnings.invalidPositionShort
                                  .replace("{{position}}", invalidPosValue)
                                  .replace("{{accepted}}", acceptedList)}
                              >
                                <AlertTriangle size={14} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              align="end"
                              className="max-w-[320px] text-xs"
                            >
                              {t.modules.warnings.invalidPosition
                                .replace("{{position}}", invalidPosValue)
                                .replace("{{accepted}}", acceptedList)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </FormControl>
                </FormItem>
              );
            }}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between py-1 px-1">
            <FormLabel className="text-xs text-gray-500">
              {t.modules.form.totalConcreteVolume}
            </FormLabel>
          </div>

          {volumes.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 py-1">—</p>
          )}

          {volumes.map((vol, index) => {
            const fieldKey = `${concreteRootKeyStr}.${index}`;
            const currentCustom =
              (customFckSelectedGlobal && customFckSelectedGlobal[fieldKey]) ??
              vol.customFck ??
              false;
            return (
              <div
                key={index}
                className="space-y-3 bg-white rounded-md border p-3"
              >
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <FormField
                      control={form.control as Control<any>}
                      name={`${concreteRootKeyStr}.${index}.fck` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.modules.form.fckLabel}
                          </FormLabel>
                          <FormControl>
                            <Select
                              value={
                                currentCustom
                                  ? "other"
                                  : String(field.value ?? "")
                              }
                              onValueChange={(val) =>
                                handleSelectFck(index, val)
                              }
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue
                                  placeholder={t.modules.form.selectFck}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {fckOptionsMapped.map((opt) => {
                                  const n = Number(opt.value);
                                  const disabled =
                                    fckOptionsPlain.includes(n) &&
                                    isFckUsed(n, index);
                                  return (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      disabled={disabled}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                      {disabled
                                        ? ` ${t.modules.form.inUse}`
                                        : ""}
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
                  </div>

                  <div>
                    <FormField
                      control={form.control as Control<any>}
                      name={`${concreteRootKeyStr}.${index}.volume` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            {t.modules.form.volume}
                          </FormLabel>
                          <div className="flex gap-1">
                            <FormControl>
                              <NumericStringInput
                                {...field}
                                decimalPlaces={4}
                                allowNegative={false}
                                className="h-9 text-xs"
                                placeholder="100,00"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeVolume(index)}
                              disabled={volumes.length <= 0}
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

                {currentCustom && (
                  <FormField
                    control={form.control as Control<any>}
                    name={`${concreteRootKeyStr}.${index}.fck` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.otherFck}
                        </FormLabel>
                        <FormControl>
                          <NumericStringInput
                            {...field}
                            decimalPlaces={0}
                            allowNegative={false}
                            className="h-9 text-xs"
                            placeholder="70"
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
            onClick={addVolume}
            className="w-full text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {volumes.length > 0 && (
            <div className="flex justify-end items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {t.modules.form.totalConcreteVolume}:
              </span>
              <span className="text-xs font-medium tabular-nums">
                {totalVolume.toInternational(undefined, 2)} m³
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-1" />

        <SteelMaterialList
          form={form as any}
          name={steelRootKeyStr as any}
          allowedMaterials={allowedMaterials}
          stepperMode={stepperMode}
          isSubmitted={isSubmitted}
          isRequiredPosition={isSteelRequired}
        />

        {formAreaKey !== undefined && (
          <>
            <div className="border-t border-gray-200 my-1" />
            <FormField
              control={form.control as Control<any>}
              name={String(formAreaKey) as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t.modules.form.formAreaOptional}
                  </FormLabel>
                  <FormControl>
                    <NumericStringInput
                      {...field}
                      decimalPlaces={2}
                      allowNegative={false}
                      placeholder="0,00"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const UnspecifiedCard = React.memo(
  UnspecifiedCardInner,
) as typeof UnspecifiedCardInner;

export const PositionedMaterialCard = UnspecifiedCard;
