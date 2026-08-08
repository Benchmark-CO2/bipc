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

interface ModuleFormPilesFoundationProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
}

const POSITION_LABEL: Record<
  string,
  "pile" | "block" | "grade_beam" | "tie_beam"
> = {
  piles: "pile",
  pile_caps: "block",
  grade_beams: "grade_beam",
  tie_beams: "tie_beam",
};

const ModuleFormPilesFoundation = ({
  form,
  stepperMode = false,
  isSubmitted = false,
}: ModuleFormPilesFoundationProps) => {
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

  const pilesVolume = useWatch({ control: form.control, name: "piles.volume" });
  const pilesSteel = useWatch({ control: form.control, name: "piles.steel" });
  const pileCapsVolume = useWatch({
    control: form.control,
    name: "pile_caps.volume",
  });
  const pileCapsSteel = useWatch({
    control: form.control,
    name: "pile_caps.steel",
  });
  const gradeBeamsVolume = useWatch({
    control: form.control,
    name: "grade_beams.volume",
  });
  const gradeBeamsSteel = useWatch({
    control: form.control,
    name: "grade_beams.steel",
  });
  const tieBeamsVolume = useWatch({
    control: form.control,
    name: "tie_beams.volume",
  });
  const tieBeamsSteel = useWatch({
    control: form.control,
    name: "tie_beams.steel",
  });

  // Detectar fck customizado ao carregar dados de edição (antes do render)
  useLayoutEffect(() => {
    if (currentFck && !fckOptions.includes(currentFck)) {
      setCustomFckSelected((p) => ({ ...p, fck: true }));
    }
  }, [currentFck]);

  const countSteelNonZero = (arr: unknown[] | undefined): number => {
    return (arr || []).reduce((count: number, s: any) => {
      const m = parseNumber(s?.mass ?? "0");
      return count + (m > 0 ? 1 : 0);
    }, 0);
  };

  const renderSection = (
    fieldGroup: "piles" | "pile_caps" | "grade_beams" | "tie_beams",
    title: string,
    volumeValue: unknown,
    steelValue: unknown[] | undefined,
    minItemsSteel: number = 1,
  ) => {
    const position = POSITION_LABEL[fieldGroup];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.piles_foundation.includes(position);

    const volNum = parseNumber((volumeValue as string | number) ?? "0");
    const steelNonZero = countSteelNonZero(steelValue);

    const isEmpty = isRequiredPosition && (volNum <= 0 || steelNonZero === 0);
    const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

    const baseBorder = isRequiredPosition
      ? "border-blue-500"
      : "border-gray-200";
    const cardBorder = shouldMarkError
      ? "border-red-500 ring-red-200"
      : baseBorder;

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary">
          {title}
          {isRequiredPosition ? <RequiredAsterisk /> : null}
        </h3>
        <Card className={`border-2 ${cardBorder}`}>
          <CardContent className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name={`${fieldGroup}.volume` as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    {t.modules.form.concreteVolume}
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

            <SteelMaterialList
              form={form}
              name={`${fieldGroup}.steel` as any}
              minItems={minItemsSteel}
              stepperMode={stepperMode}
              isSubmitted={isSubmitted}
              isRequiredPosition={isRequiredPosition}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <RequiredLegend legend={t.modules.form.requiredLegend} />

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
                <RequiredAsterisk />
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
                    if (field.value && !fckOptions.includes(field.value)) {
                      return "other";
                    } else if (
                      field.value &&
                      fckOptions.includes(field.value)
                    ) {
                      return field.value.toString();
                    }
                    return "";
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
                  <RequiredAsterisk />
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="70"
                    {...field}
                    value={field.value?.toString() || ""}
                    onChange={(e) =>
                      field.onChange(Number(masks.numeric(e.target.value)) || 0)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </div>

      {renderSection("piles", t.modules.form.piles, pilesVolume, pilesSteel, 1)}
      {renderSection(
        "pile_caps",
        t.modules.form.pileCaps,
        pileCapsVolume,
        pileCapsSteel,
        0,
      )}
      {renderSection(
        "grade_beams",
        t.modules.form.gradeBeams,
        gradeBeamsVolume,
        gradeBeamsSteel,
        0,
      )}
      {renderSection(
        "tie_beams",
        t.modules.form.tieBeams,
        tieBeamsVolume,
        tieBeamsSteel,
        0,
      )}

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

export default ModuleFormPilesFoundation;
