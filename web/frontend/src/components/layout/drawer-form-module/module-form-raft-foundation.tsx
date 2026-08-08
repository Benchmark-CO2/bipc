import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { useTranslation } from "@/i18n";
import { useLayoutEffect, useState } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
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
import { REQUIRED_POSITIONS_BY_TYPE } from "./module-default-values";
import { RequiredAsterisk, RequiredLegend } from "./required-indicators";
import { UnspecifiedCard, useUnspecifiedDataInit } from "./unspecified-card";

interface ModuleFormRaftFoundationProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
}

const ModuleFormRaftFoundation = ({
  form,
  stepperMode = false,
  isSubmitted = false,
}: ModuleFormRaftFoundationProps) => {
  const { t } = useTranslation();
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  useUnspecifiedDataInit(form as any);

  const currentFck = form.watch("fck");
  const isCustomFck =
    customFckSelected["fck"] ||
    (currentFck && !fckOptions.includes(currentFck));

  const position = "raft";
  const isRequiredPosition =
    REQUIRED_POSITIONS_BY_TYPE.raft_foundation.includes(position);

  const areaValue = useWatch({ control: form.control, name: "area" });
  const thicknessValue = useWatch({
    control: form.control,
    name: "thickness",
  });
  const steelArray = useWatch({ control: form.control, name: "steel" });

  const areaNum = parseNumber(areaValue ?? "0");
  const thicknessNum = parseNumber(thicknessValue ?? "0");
  const steelNonZero = (steelArray || []).reduce((count: number, s: any) => {
    const m = parseNumber(s?.mass ?? "0");
    return count + (m > 0 ? 1 : 0);
  }, 0);

  const isEmpty =
    isRequiredPosition &&
    (areaNum <= 0 || thicknessNum <= 0 || steelNonZero === 0);
  const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

  const baseBorder = isRequiredPosition ? "border-blue-500" : "border-gray-200";
  const cardBorder = shouldMarkError
    ? "border-red-500 ring-red-200"
    : baseBorder;

  // Detectar fck customizado ao carregar dados de edição (antes do render)
  useLayoutEffect(() => {
    if (currentFck && !fckOptions.includes(currentFck)) {
      setCustomFckSelected((p) => ({ ...p, fck: true }));
    }
  }, [currentFck]);

  return (
    <div className="space-y-4">
      <RequiredLegend legend={t.modules.form.requiredLegend} />

      <Card className={`border-2 ${cardBorder}`}>
        <CardContent className="space-y-4 pt-4">
          {/* Área e Espessura */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t.modules.form.area}
                    {isRequiredPosition ? <RequiredAsterisk /> : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thickness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t.modules.form.thickness}
                    {isRequiredPosition ? <RequiredAsterisk /> : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* fck */}
          <div
            className={`grid gap-4 ${isCustomFck ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <FormField
              control={form.control}
              name="fck"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t.modules.form.fckLabel}
                    {isRequiredPosition ? <RequiredAsterisk /> : null}
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        if (!value || value === "") {
                          return;
                        }

                        if (value === "other") {
                          setCustomFckSelected((p) => ({ ...p, fck: true }));
                          if (!currentFck || fckOptions.includes(currentFck)) {
                            field.onChange(70);
                          }
                        } else {
                          setCustomFckSelected((p) => ({ ...p, fck: false }));
                          field.onChange(Number(value));
                        }
                      }}
                      value={(() => {
                        let selectValue: string;

                        if (field.value && !fckOptions.includes(field.value)) {
                          selectValue = "other";
                        } else if (
                          field.value &&
                          fckOptions.includes(field.value)
                        ) {
                          selectValue = field.value.toString();
                        } else {
                          selectValue = "";
                        }

                        return selectValue;
                      })()}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t.modules.form.selectFck} />
                      </SelectTrigger>
                      <SelectContent>
                        {fckOptions.map((fck) => (
                          <SelectItem key={fck} value={fck.toString()}>
                            {fck}
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

            {isCustomFck && (
              <FormField
                control={form.control}
                name="fck"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t.modules.form.otherFck}
                      {isRequiredPosition ? <RequiredAsterisk /> : null}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="70"
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e) =>
                          field.onChange(
                            Number(masks.numeric(e.target.value)) || 0,
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          <h3 className="text-base font-semibold text-primary">
            {t.modules.form.steel}
            {isRequiredPosition ? <RequiredAsterisk /> : null}
          </h3>

          <SteelMaterialList
            form={form}
            name="steel"
            allowedMaterials={["rebar", "mesh", "strand", "other"]}
            stepperMode={stepperMode}
            isSubmitted={isSubmitted}
            isRequiredPosition={isRequiredPosition}
          />
        </CardContent>
      </Card>

      {/* Sem Posição / Geral */}
      <UnspecifiedCard
        form={form as any}
        fckOptions={fckOptions}
        customFckSelectedGlobal={customFckSelected}
        setCustomFckSelectedGlobal={setCustomFckSelected}
        concreteRootKey="unspecified.volumes"
        steelRootKey="unspecified.steel"
        isSteelRequired={false}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        allowedMaterials={["rebar", "mesh", "strand", "other"]}
      />
    </div>
  );
};

export default ModuleFormRaftFoundation;
