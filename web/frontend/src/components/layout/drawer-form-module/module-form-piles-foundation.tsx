import { masks } from "@/utils/masks";
import { parseNumber } from "@/utils/numbers";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { useTranslation } from "@/i18n";
import { useLayoutEffect, useState } from "react";
import { UseFormReturn, useWatch, Path } from "react-hook-form";
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
import {
  RequiredAsterisk,
  RequiredFieldBadge,
  RequiredLegend,
} from "./required-indicators";
import { UnspecifiedCard, useUnspecifiedDataInit } from "./unspecified-card";
import type { ModuleFormSource } from "./index";
import type {
  TPilesFoundationPosition,
  TFck,
  TSteelMaterial,
  TSteelResistance,
} from "@/types/modules";
import type { PilesFoundationGroupedForm } from "./aggregate-helpers";

interface ModuleFormPilesFoundationProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
  source?: ModuleFormSource;
}

interface SteelMaterialRow {
  material: TSteelMaterial;
  other_name?: string;
  resistance: TSteelResistance;
  other_resistance?: number;
  mass: string | number;
  position?: TPilesFoundationPosition;
}

type PilesFieldGroup = "piles" | "pile_caps" | "grade_beams" | "tie_beams";

const POSITION_LABEL: Record<
  PilesFieldGroup,
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
  source = "default",
}: ModuleFormPilesFoundationProps) => {
  const { t } = useTranslation();
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const [customFckSelected, setCustomFckSelected] = useState<
    Record<string, boolean>
  >({});

  useUnspecifiedDataInit(form);

  const isAggregatedInputMode = source === "ifc" || source === "tqs";

  const aggregatedTitle =
    source === "ifc"
      ? (t.modules.form.ifcSourceLabel ?? "Materiais (IFC)")
      : source === "tqs"
        ? (t.modules.form.tqsSourceLabel ?? "Materiais (TQS)")
        : undefined;

  const pfForm = form as UseFormReturn<PilesFoundationGroupedForm>;

  const currentFck = pfForm.watch("fck");
  const isCustomFck =
    customFckSelected["fck"] ||
    (currentFck && !fckOptions.includes(Number(currentFck)));

  const pilesVolume = useWatch({
    control: pfForm.control,
    name: "piles.volume",
  });
  const pilesSteel = useWatch({
    control: pfForm.control,
    name: "piles.steel",
  });
  const pileCapsVolume = useWatch({
    control: pfForm.control,
    name: "pile_caps.volume",
  });
  const pileCapsSteel = useWatch({
    control: pfForm.control,
    name: "pile_caps.steel",
  });
  const gradeBeamsVolume = useWatch({
    control: pfForm.control,
    name: "grade_beams.volume",
  });
  const gradeBeamsSteel = useWatch({
    control: pfForm.control,
    name: "grade_beams.steel",
  });
  const tieBeamsVolume = useWatch({
    control: pfForm.control,
    name: "tie_beams.volume",
  });
  const tieBeamsSteel = useWatch({
    control: pfForm.control,
    name: "tie_beams.steel",
  });

  useLayoutEffect(() => {
    if (currentFck && !fckOptions.includes(Number(currentFck))) {
      setCustomFckSelected((p) => ({ ...p, fck: true }));
    }
  }, [currentFck]);

  const countSteelNonZero = (arr: unknown[] | undefined): number => {
    return (arr || []).reduce((count: number, s: unknown) => {
      const row = s as SteelMaterialRow;
      const m = parseNumber(String(row?.mass ?? "0"));
      return count + (m > 0 ? 1 : 0);
    }, 0);
  };

  const renderSection = (
    fieldGroup: PilesFieldGroup,
    title: string,
    volumeValue: unknown,
    steelValue: unknown[] | undefined,
    minItemsSteel: number = 1,
  ) => {
    const position = POSITION_LABEL[fieldGroup];
    const isRequiredPosition =
      REQUIRED_POSITIONS_BY_TYPE.piles_foundation.includes(position);

    const volNum = parseNumber(
      (volumeValue as string | number | undefined) ?? "0",
    );
    const steelNonZero = countSteelNonZero(steelValue);

    const isEmpty = isRequiredPosition && (volNum <= 0 || steelNonZero === 0);
    const shouldMarkError = isEmpty && (stepperMode || isSubmitted);

    const baseBorder = isRequiredPosition
      ? "border-blue-500"
      : "border-gray-200";
    const cardBorder = shouldMarkError
      ? "border-red-500 ring-red-200"
      : baseBorder;

    const volumePath = `${fieldGroup}.volume` as const;
    const steelPath = `${fieldGroup}.steel` as const;

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary">
          {title}
          {isRequiredPosition ? <RequiredAsterisk /> : null}
        </h3>
        <Card className={`border-2 ${cardBorder}`}>
          <CardContent className="space-y-4 pt-4">
            <FormField
              control={pfForm.control}
              name={volumePath as Path<PilesFoundationGroupedForm>}
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
                      value={(field.value as string | number) ?? ""}
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
              name={steelPath}
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
      {!isAggregatedInputMode ? (
        <RequiredLegend legend={t.modules.form.requiredLegend} />
      ) : null}

      {isAggregatedInputMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <RequiredFieldBadge variant="ifc" source={source} />
        </div>
      )}

      {!isAggregatedInputMode && (
        <>
          <div
            className={`grid gap-4 ${isCustomFck ? "grid-cols-2" : "grid-cols-1"}`}
          >
            <FormField
              control={pfForm.control}
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
                          if (
                            !currentFck ||
                            fckOptions.includes(Number(currentFck))
                          ) {
                            field.onChange(70);
                          }
                        } else {
                          setCustomFckSelected((p) => ({ ...p, fck: false }));
                          field.onChange(Number(value));
                        }
                      }}
                      value={(() => {
                        if (
                          field.value &&
                          !fckOptions.includes(Number(field.value))
                        ) {
                          return "other";
                        } else if (
                          field.value &&
                          fckOptions.includes(Number(field.value))
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
                control={pfForm.control}
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

          {renderSection(
            "piles",
            t.modules.form.piles,
            pilesVolume,
            pilesSteel as SteelMaterialRow[] | undefined,
            1,
          )}
          {renderSection(
            "pile_caps",
            t.modules.form.pileCaps,
            pileCapsVolume,
            pileCapsSteel as SteelMaterialRow[] | undefined,
            0,
          )}
          {renderSection(
            "grade_beams",
            t.modules.form.gradeBeams,
            gradeBeamsVolume,
            gradeBeamsSteel as SteelMaterialRow[] | undefined,
            0,
          )}
          {renderSection(
            "tie_beams",
            t.modules.form.tieBeams,
            tieBeamsVolume,
            tieBeamsSteel as SteelMaterialRow[] | undefined,
            0,
          )}
        </>
      )}

      <UnspecifiedCard
        form={form}
        fckOptions={fckOptions}
        customFckSelectedGlobal={customFckSelected}
        setCustomFckSelectedGlobal={setCustomFckSelected}
        concreteRootKey="unspecified.volumes"
        steelRootKey="unspecified.steel"
        isSteelRequired={isAggregatedInputMode}
        stepperMode={stepperMode}
        isSubmitted={isSubmitted}
        allowedMaterials={["rebar", "mesh", "strand", "other"]}
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

export default ModuleFormPilesFoundation;
