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
  TRaftPilesFoundationPosition,
  TFck,
  TSteelMaterial,
  TSteelResistance,
} from "@/types/modules";
import type { RaftPilesFoundationGroupedForm } from "./aggregate-helpers";

interface ModuleFormRaftPilesFoundationProps {
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
  position?: TRaftPilesFoundationPosition;
}

const ModuleFormRaftPilesFoundation = ({
  form,
  stepperMode = false,
  isSubmitted = false,
  source = "default",
}: ModuleFormRaftPilesFoundationProps) => {
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

  const rpfForm = form as UseFormReturn<RaftPilesFoundationGroupedForm>;

  const currentFck = rpfForm.watch("fck");
  const isCustomFck =
    customFckSelected["fck"] ||
    (currentFck && !fckOptions.includes(Number(currentFck)));

  const raftArea = useWatch({
    control: rpfForm.control,
    name: "raft.area",
  });
  const raftThickness = useWatch({
    control: rpfForm.control,
    name: "raft.thickness",
  });
  const raftSteel = useWatch({
    control: rpfForm.control,
    name: "raft.steel",
  });
  const pilesVolume = useWatch({
    control: rpfForm.control,
    name: "piles.volume",
  });
  const pilesSteel = useWatch({
    control: rpfForm.control,
    name: "piles.steel",
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

  const isRequiredRaft =
    REQUIRED_POSITIONS_BY_TYPE.raft_piles_foundation.includes("raft");
  const isRequiredPile =
    REQUIRED_POSITIONS_BY_TYPE.raft_piles_foundation.includes("pile");

  const raftAreaNum = parseNumber((raftArea as string | number) ?? "0");
  const raftThicknessNum = parseNumber(
    (raftThickness as string | number) ?? "0",
  );
  const raftSteelNonZero = countSteelNonZero(
    raftSteel as SteelMaterialRow[] | undefined,
  );
  const pilesVolumeNum = parseNumber((pilesVolume as string | number) ?? "0");
  const pilesSteelNonZero = countSteelNonZero(
    pilesSteel as SteelMaterialRow[] | undefined,
  );

  const isRaftEmpty =
    isRequiredRaft &&
    (raftAreaNum <= 0 || raftThicknessNum <= 0 || raftSteelNonZero === 0);
  const shouldMarkRaftError = isRaftEmpty && (stepperMode || isSubmitted);
  const raftBaseBorder = isRequiredRaft ? "border-blue-500" : "border-gray-200";
  const raftCardBorder = shouldMarkRaftError
    ? "border-red-500 ring-red-200"
    : raftBaseBorder;

  const isPilesEmpty =
    isRequiredPile && (pilesVolumeNum <= 0 || pilesSteelNonZero === 0);
  const shouldMarkPilesError = isPilesEmpty && (stepperMode || isSubmitted);
  const pilesBaseBorder = isRequiredPile
    ? "border-blue-500"
    : "border-gray-200";
  const pilesCardBorder = shouldMarkPilesError
    ? "border-red-500 ring-red-200"
    : pilesBaseBorder;

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
              control={rpfForm.control}
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
                control={rpfForm.control}
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

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-primary">
              {t.modules.form.raft}
              {isRequiredRaft ? <RequiredAsterisk /> : null}
            </h3>
            <Card className={`border-2 ${raftCardBorder}`}>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={rpfForm.control}
                    name="raft.area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.raftArea}
                          {isRequiredRaft ? <RequiredAsterisk /> : null}
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

                  <FormField
                    control={rpfForm.control}
                    name="raft.thickness"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          {t.modules.form.raftThickness}
                          {isRequiredRaft ? <RequiredAsterisk /> : null}
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
                </div>

                <div className="border-t border-gray-200 my-4"></div>

                <SteelMaterialList
                  form={form}
                  name="raft.steel"
                  allowedMaterials={["rebar", "mesh", "strand", "other"]}
                  stepperMode={stepperMode}
                  isSubmitted={isSubmitted}
                  isRequiredPosition={isRequiredRaft}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-primary">
              {t.modules.form.piles}
              {isRequiredPile ? <RequiredAsterisk /> : null}
            </h3>
            <Card className={`border-2 ${pilesCardBorder}`}>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={rpfForm.control}
                  name="piles.volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t.modules.form.concreteVolume}
                        {isRequiredPile ? <RequiredAsterisk /> : null}
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
                  name="piles.steel"
                  stepperMode={stepperMode}
                  isSubmitted={isSubmitted}
                  isRequiredPosition={isRequiredPile}
                />
              </CardContent>
            </Card>
          </div>
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

export default ModuleFormRaftPilesFoundation;
