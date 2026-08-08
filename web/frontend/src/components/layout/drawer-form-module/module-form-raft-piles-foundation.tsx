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

interface ModuleFormRaftPilesFoundationProps {
  form: UseFormReturn<ModuleFormState>;
  stepperMode?: boolean;
  isSubmitted?: boolean;
}

const ModuleFormRaftPilesFoundation = ({
  form,
  stepperMode = false,
  isSubmitted = false,
}: ModuleFormRaftPilesFoundationProps) => {
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

  const raftArea = useWatch({ control: form.control, name: "raft.area" });
  const raftThickness = useWatch({
    control: form.control,
    name: "raft.thickness",
  });
  const raftSteel = useWatch({ control: form.control, name: "raft.steel" });
  const pilesVolume = useWatch({ control: form.control, name: "piles.volume" });
  const pilesSteel = useWatch({ control: form.control, name: "piles.steel" });

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

  const isRequiredRaft =
    REQUIRED_POSITIONS_BY_TYPE.raft_piles_foundation.includes("raft");
  const isRequiredPile =
    REQUIRED_POSITIONS_BY_TYPE.raft_piles_foundation.includes("pile");

  const raftAreaNum = parseNumber(raftArea ?? "0");
  const raftThicknessNum = parseNumber(raftThickness ?? "0");
  const raftSteelNonZero = countSteelNonZero(raftSteel);
  const pilesVolumeNum = parseNumber((pilesVolume as string | number) ?? "0");
  const pilesSteelNonZero = countSteelNonZero(pilesSteel);

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
      <RequiredLegend legend={t.modules.form.requiredLegend} />

      {/* fck Único para Radier e Estacas */}
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

      {/* Radier */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.raft}
          {isRequiredRaft ? <RequiredAsterisk /> : null}
        </h3>
        <Card className={`border-2 ${raftCardBorder}`}>
          <CardContent className="space-y-4 pt-4">
            {/* Área e Espessura do Radier */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
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

            {/* Aço do Radier */}
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

      {/* Estacas */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-primary">
          {t.modules.form.piles}
          {isRequiredPile ? <RequiredAsterisk /> : null}
        </h3>
        <Card className={`border-2 ${pilesCardBorder}`}>
          <CardContent className="space-y-4 pt-4">
            {/* Volume das Estacas */}
            <FormField
              control={form.control}
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
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Aço das Estacas */}
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

export default ModuleFormRaftPilesFoundation;
