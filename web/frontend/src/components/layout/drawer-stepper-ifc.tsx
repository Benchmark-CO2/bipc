import { postModulesBatch } from "@/actions/modules/postModulesBatch";
import { postOption } from "@/actions/options/postOption";
import { getOptions } from "@/actions/options/getOptions";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { postUnit } from "@/actions/units/postUnit";
import { patchUnit } from "@/actions/units/patchUnit";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";
import { IProject } from "@/types/projects";
import { TOption } from "@/types/options";
import {
  FOUNDATION_MODULE_TYPES,
  ModuleParamsProps,
  ModuleParamsPropsV2,
  TModulesTypes,
  TModuleDataV2,
} from "@/types/modules";
import {
  TIfcStepperCreatedUnit,
  TIfcStepperModuleItem,
  TIfcStepperState,
  TIfcStepperUnitItem,
  TIfcProcessorStateUnit,
  IRawModuleDataWithMeta,
  IOptionsResponse,
  IPatchUnitResponse,
  IPostUnitResponse,
  IPostOptionResponse,
  IModuleBatchBinding,
  DrawerStepperIFCProps,
} from "@/types/ifc";
import { useFloorIndexMappings } from "@/hooks/useFloorIndexMappings";
import { structureTypes } from "@/utils/structureTypes";
import { parseApiError } from "@/utils/parseApiError";
import { mapFloorIndexToFloorIds } from "@/utils/unitConversions";
import {
  aggregateIdenticalFloors,
  buildUniqueSimulationName,
  mapIfcResultToStepperState,
  MODULE_TYPE_LABEL_FALLBACK,
  prepareModuleForBatch,
  prepareUnitForCreate,
  rerunModuleValidation,
  rerunUnitValidation,
} from "@/utils/ifcStepper";
import { UnitFormInput, UnitFormSchema } from "@/validators/unitForm.validator";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DrawerFormModule from "./drawer-form-module";
import DrawerFormUnit from "./drawer-form-unit";
import { StepperHeader } from "./drawer-stepper-ifc/views/StepperHeader";
import { Step1Content } from "./drawer-stepper-ifc/views/Step1Content";
import { Step2Content } from "./drawer-stepper-ifc/views/Step2Content";
import { CompletenessWarningsI18n } from "@/components/layout/drawer-form-module/aggregate-helpers";

export default function DrawerStepperIFC({
  open,
  onOpenChange,
  projectId,
  initialResult,
  initialRoleId,
  mode,
  preselectedUnitId,
  preselectedOptionId,
  fileName,
  onComplete,
}: DrawerStepperIFCProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const translations = t as Translations;
  const i18nCompleteness = (
    translations.modules.form as unknown as {
      completeness?: CompletenessWarningsI18n;
    }
  ).completeness as CompletenessWarningsI18n;

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
    enabled: open,
  });
  const project: IProject | undefined = projectData?.data.project;

  const isSimulationMode = mode === "simulation";

  const { data: optionsData, refetch: refetchOptions } = useQuery({
    queryKey: ["options", projectId, preselectedUnitId, initialRoleId],
    queryFn: () =>
      getOptions(projectId, preselectedUnitId || "", initialRoleId || ""),
    enabled: open && isSimulationMode && !!preselectedUnitId && !!initialRoleId,
    staleTime: 1000 * 30,
  });
  const availableOptions: TOption[] =
    (optionsData?.data as IOptionsResponse | undefined)?.options ?? [];

  // Fetch da UNIDADE existente quando estivermos no modo simulation
  // (para pegar os floors e poder mapear floor_index number → floor_ids UUIDs)
  const { data: simulationUnitData } = useQuery({
    queryKey: ["unit", projectId, preselectedUnitId],
    queryFn: () => getUnitByUUID(projectId, preselectedUnitId || ""),
    enabled: open && isSimulationMode && !!preselectedUnitId,
    staleTime: 1000 * 60 * 5,
  });

  const [selectedSimulationOptionId, setSelectedSimulationOptionId] = useState<
    string | null
  >(preselectedOptionId ?? null);

  useEffect(() => {
    if (!isSimulationMode) return;
    if (selectedSimulationOptionId) return;
    if (preselectedOptionId) {
      setSelectedSimulationOptionId(preselectedOptionId);
      return;
    }
    if (availableOptions.length === 0) return;
    const active = availableOptions.find((o) => o.active);
    if (active) {
      setSelectedSimulationOptionId(active.id);
    } else {
      setSelectedSimulationOptionId(availableOptions[0]?.id ?? null);
    }
  }, [
    isSimulationMode,
    availableOptions,
    preselectedOptionId,
    selectedSimulationOptionId,
  ]);

  const initialState = useMemo<TIfcStepperState>(() => {
    const base = mapIfcResultToStepperState(
      initialResult,
      t as unknown as Translations,
    );
    if (isSimulationMode) {
      return {
        ...base,
        currentStep: "modules",
        units: [],
      };
    }
    return base;
  }, [initialResult, isSimulationMode]);

  const [state, setState] = useState<TIfcStepperState>(initialState);
  const [step1Error, setStep1Error] = useState<string>("");
  const [step2Error, setStep2Error] = useState<string>("");
  const [isCreatingStep1, setIsCreatingStep1] = useState(false);
  const [isCreatingStep2, setIsCreatingStep2] = useState(false);

  const [editingUnitTempId, setEditingUnitTempId] = useState<string | null>(
    null,
  );
  const [editingModuleTempId, setEditingModuleTempId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (isSimulationMode) {
      setState({
        ...initialState,
        currentStep: "modules",
        units: [],
      });
    } else {
      setState(initialState);
    }
    setStep1Error("");
    setStep2Error("");
    setIsCreatingStep1(false);
    setIsCreatingStep2(false);
    setEditingUnitTempId(null);
    setEditingModuleTempId(null);
  }, [initialState, isSimulationMode]);

  const simulationBoundUnitTempId = "__simulation__";

  // Todas as unitIds que temos no momento (unitsCreated.unitId)
  // Para cada uma delas, se não conseguimos floors via state.units (modo normal)
  // e a unitId é uma string válida (UUID), fazemos fetch para preencher.
  // Evita que o BuildingVisualizer apareça vazio durante a edição no drawer.
  const unitsCreatedIdsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const uc of state.unitsCreated) {
      if (uc.unitId && uc.tempId !== simulationBoundUnitTempId) {
        map.set(uc.tempId, uc.unitId);
      }
    }
    return map;
  }, [state.unitsCreated, simulationBoundUnitTempId]);

  // (useQueries dinâmico) fetch getUnitByUUID para cada unidade existente
  // criada em unitsCreated (para modo normal, quando a unidade já existia previamente
  // — ex.: reuso no step 1) — garante que o queryClient tem os floors cacheados
  // para o normalizedUnitsFloorMap usar como fallback (D) acima.
  useQueries({
    queries: Array.from(unitsCreatedIdsMap.entries()).map(
      ([tempId, unitId]) => ({
        queryKey: ["unit", projectId, unitId, "stepper"],
        queryFn: () => getUnitByUUID(projectId, unitId || ""),
        enabled:
          open &&
          !!projectId &&
          !!unitId &&
          tempId !== simulationBoundUnitTempId,
        staleTime: 1000 * 60 * 5,
      }),
    ),
  });

  const simulationCreatedUnit: TIfcStepperCreatedUnit | null = useMemo(() => {
    if (!isSimulationMode) return null;
    if (!preselectedUnitId || !selectedSimulationOptionId) return null;
    const selected = availableOptions.find(
      (o) => o.id === selectedSimulationOptionId,
    );
    const display = selected?.name ?? "Simulação alvo";
    return {
      tempId: simulationBoundUnitTempId,
      unitId: preselectedUnitId,
      optionId: selectedSimulationOptionId,
      roleId: initialRoleId,
      name: selected?.name ?? display,
      unitName: selected?.name ?? display,
      displayName: display,
      needsUpdate: false,
    };
  }, [
    isSimulationMode,
    preselectedUnitId,
    selectedSimulationOptionId,
    availableOptions,
    initialRoleId,
    simulationBoundUnitTempId,
  ]);

  useEffect(() => {
    if (!isSimulationMode) return;
    if (!simulationCreatedUnit) return;
    setState((prev) => {
      const unitsCreated: TIfcStepperCreatedUnit[] = [simulationCreatedUnit];
      const modules = prev.modules.map((m) => ({
        ...m,
        boundUnitTempId: simulationCreatedUnit.tempId,
        boundUnitId: simulationCreatedUnit.unitId,
        boundOptionId: simulationCreatedUnit.optionId,
      }));
      const next: TIfcStepperState = {
        ...prev,
        unitsCreated,
        modules,
      };
      return next;
    });
  }, [isSimulationMode, simulationCreatedUnit, simulationBoundUnitTempId]);

  const activeStep = isSimulationMode
    ? 0
    : state.currentStep === "units"
      ? 0
      : 1;

  const steps = isSimulationMode
    ? [
        {
          id: "modules",
          label: translations.stepper.stepModules,
          description: translations.stepper.stepSimulationModulesDescription,
        },
      ]
    : [
        {
          id: "units",
          label: translations.stepper.stepUnits,
          description: translations.stepper.stepUnitsDescription,
        },
        {
          id: "modules",
          label: translations.stepper.stepModules,
          description: translations.stepper.stepModulesDescription,
        },
      ];

  const {
    editingUnit,
    editingModule,
    editingModuleBoundUnit,
    normalizedUnitsFloorMap,
    editingUnitFloors,
    editingModuleInitialSelectedFloors,
    editingModuleInitialMerged,
  } = useFloorIndexMappings({
    state,
    isSimulationMode,
    simulationBoundUnitTempId,
    simulationUnitData,
    projectId,
    simulationCreatedUnit,
    editingUnitTempId,
    editingModuleTempId,
  });

  // ---------------------------------------------------------------------------
  // Step 1 — Units helpers
  // ---------------------------------------------------------------------------

  const toggleUnitSelected = (tempId: string) => {
    setState((prev) => ({
      ...prev,
      units: prev.units.map((u) =>
        u.tempId === tempId ? { ...u, selected: !u.selected } : u,
      ),
    }));
  };

  const setUnitNameInline = (tempId: string, name: string) => {
    setState((prev) => {
      const next = { ...prev };
      next.units = next.units.map((u) => {
        if (u.tempId !== tempId) return u;
        const updated: TIfcStepperUnitItem = {
          ...u,
          name,
          formData: { ...u.formData, name },
        };
        return rerunUnitValidation(updated, t as unknown as Translations);
      });
      return next;
    });
  };

  const handleUnitDrawerSubmit = (payload: {
    unitId?: string;
    data: UnitFormSchema;
    formInput: UnitFormInput;
    unit: TIfcProcessorStateUnit;
  }) => {
    if (!editingUnitTempId) return;
    const currentEditingTempId = editingUnitTempId;
    setState((prev) => {
      const next = { ...prev };
      next.units = next.units.map((u) => {
        if (u.tempId !== currentEditingTempId) return u;
        const raw =
          payload.formInput as unknown as TIfcStepperUnitItem["formData"];
        const aggregatedFloors = aggregateIdenticalFloors(
          raw?.data?.floors ?? [],
        );
        const fd: TIfcStepperUnitItem["formData"] = {
          ...raw,
          data: {
            ...(raw?.data ?? {}),
            floors: aggregatedFloors,
          },
        };
        const updated: TIfcStepperUnitItem = {
          ...u,
          formData: fd,
          name: fd.name,
        };
        return rerunUnitValidation(updated, t as unknown as Translations);
      });
      const alreadyHasCreated = prev.unitsCreated.some(
        (c) => c.tempId === currentEditingTempId,
      );
      if (alreadyHasCreated) {
        next.unitsCreated = prev.unitsCreated.map((c) => {
          if (c.tempId !== currentEditingTempId) return c;
          const newUnitName =
            (payload.formInput as unknown as TIfcStepperUnitItem["formData"])
              ?.name ?? c.unitName;
          return {
            ...c,
            unitName: newUnitName,
            displayName: `${newUnitName} — ${c.name}`,
            needsUpdate: true,
          };
        });
      }
      return next;
    });
    setEditingUnitTempId(null);
  };

  const goToStep1 = () => {
    setState((prev) => ({ ...prev, currentStep: "units" }));
  };

  const step1CanProceed =
    state.units.length > 0 &&
    state.units.some((u) => u.selected) &&
    state.units.filter((u) => u.selected).every((u) => u.isValid);

  const handleStep1CreateAndNext = async () => {
    setStep1Error("");
    const selectedUnits = state.units.filter((u) => u.selected);
    if (selectedUnits.length === 0) {
      toast.error("Selecione pelo menos uma unidade para criar.");
      return;
    }
    const invalidSelected = selectedUnits.filter((u) => !u.isValid);
    if (invalidSelected.length > 0) {
      toast.error(
        `${invalidSelected.length} unidade(s) selecionada(s) são inválidas. Corrija ou desmarque antes de prosseguir.`,
      );
      return;
    }
    const projectObj = project;
    if (!projectObj) {
      toast.error("Dados do projeto não carregados. Tente novamente.");
      return;
    }
    if (!initialRoleId) {
      toast.error(t.drawerIFC.simulationRoleMissing);
      return;
    }
    const simRoleId = initialRoleId;

    setIsCreatingStep1(true);
    const result: TIfcStepperCreatedUnit[] = [];
    let createdCount = 0;
    let reusedCount = 0;
    let patchedCount = 0;

    try {
      const existingNames: string[] = [];
      for (const unit of selectedUnits) {
        const alreadyCreated = state.unitsCreated.find(
          (c) => c.tempId === unit.tempId,
        );
        if (alreadyCreated) {
          if (alreadyCreated.needsUpdate) {
            const updatePayload: UnitFormSchema = prepareUnitForCreate(
              unit.formData,
            ) as unknown as UnitFormSchema;
            const patchRes = await patchUnit(
              updatePayload,
              projectId,
              alreadyCreated.unitId,
            );
            const patchBody: IPatchUnitResponse = (
              patchRes as { data: IPatchUnitResponse }
            ).data;
            const updatedUnitObj: TIfcProcessorStateUnit | undefined =
              patchBody?.unit ?? patchBody?.data?.unit;
            const patchedRecord: TIfcStepperCreatedUnit = {
              ...alreadyCreated,
              unitId: updatedUnitObj?.id ?? alreadyCreated.unitId,
              unitName: unit.formData.name,
              displayName: `${unit.formData.name} — ${alreadyCreated.name}`,
              needsUpdate: false,
            };
            result.push(patchedRecord);
            patchedCount += 1;
            existingNames.push(alreadyCreated.name);
            continue;
          }
          const cleanReuse: TIfcStepperCreatedUnit = {
            ...alreadyCreated,
            unitName: unit.formData.name,
            displayName: `${unit.formData.name} — ${alreadyCreated.name}`,
            needsUpdate: false,
          };
          result.push(cleanReuse);
          reusedCount += 1;
          existingNames.push(alreadyCreated.name);
          continue;
        }

        const createPayload: UnitFormSchema = prepareUnitForCreate(
          unit.formData,
        ) as unknown as UnitFormSchema;
        const unitRes = await postUnit(createPayload, projectId);
        const unitBody: IPostUnitResponse = (
          unitRes as { data: IPostUnitResponse }
        ).data;
        const unitObj: TIfcProcessorStateUnit | undefined =
          unitBody?.unit ?? unitBody?.data?.unit;
        const unitId = unitObj?.id;
        if (!unitId) {
          throw new Error(
            "Resposta da criação da unidade não retornou unit.id.",
          );
        }

        const simName = buildUniqueSimulationName(
          unit.formData.name,
          existingNames,
        );
        existingNames.push(simName);

        const optionRes = await postOption(projectId, unitId, simRoleId, {
          name: simName,
          active: true,
        });
        const optionBody: IPostOptionResponse = (
          optionRes as { data: IPostOptionResponse }
        ).data;
        const optionObj: TOption | undefined =
          optionBody?.option ??
          optionBody?.data?.option ??
          optionBody?.tower_option ??
          optionBody?.data?.tower_option;
        const optionId = optionObj?.id;
        if (!optionId) {
          throw new Error(
            `Resposta da criação da simulação não retornou option.id (unidade: ${unit.formData.name}).`,
          );
        }

        const record: TIfcStepperCreatedUnit = {
          tempId: unit.tempId,
          unitId,
          optionId,
          roleId: simRoleId,
          name: simName,
          unitName: unit.formData.name,
          displayName: `${unit.formData.name} — ${simName}`,
          needsUpdate: false,
        };
        result.push(record);
        createdCount += 1;
      }

      setState((prev) => {
        const withBound = { ...prev, unitsCreated: result };
        if (result.length > 0) {
          const firstResult = result[0];
          withBound.modules = prev.modules.map((m) => {
            if (m.boundUnitTempId) {
              const found = result.find((c) => c.tempId === m.boundUnitTempId);
              if (found) {
                const next: typeof m = {
                  ...m,
                  boundUnitId: found.unitId,
                  boundOptionId: found.optionId,
                };
                return next;
              }
            }
            if (!m.boundUnitTempId && result.length === 1) {
              return {
                ...m,
                boundUnitTempId: firstResult.tempId,
                boundUnitId: firstResult.unitId,
                boundOptionId: firstResult.optionId,
              };
            }
            return m;
          });
        }
        withBound.currentStep = "modules";
        return withBound;
      });
      const total = createdCount + patchedCount + reusedCount;
      if (total === createdCount && reusedCount === 0 && patchedCount === 0) {
        toast.success(
          `${createdCount} unidade(s) e simulação(ões) criada(s) com sucesso.`,
        );
      } else if (createdCount === 0 && patchedCount > 0 && reusedCount === 0) {
        toast.success(`${patchedCount} unidade(s) atualizada(s) com sucesso.`);
      } else if (createdCount === 0 && patchedCount === 0 && reusedCount > 0) {
        toast.success(
          `${reusedCount} unidade(s) já existiam — seguindo para o passo de módulos.`,
        );
      } else {
        const parts: string[] = [];
        if (createdCount > 0) parts.push(`${createdCount} criada(s)`);
        if (patchedCount > 0) parts.push(`${patchedCount} atualizada(s)`);
        if (reusedCount > 0) parts.push(`${reusedCount} reutilizada(s)`);
        toast.success(`${parts.join(", ")}. Seguindo para módulos.`);
      }
    } catch (err) {
      const msg = parseApiError(err, t);
      setStep1Error(msg);
      toast.error("Falha ao criar/atualizar unidades/simulações.", {
        description: msg,
      });
    } finally {
      setIsCreatingStep1(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2 — Modules helpers
  // ---------------------------------------------------------------------------

  const applyUnitToAllModules = (unitTempId: string) => {
    const found = state.unitsCreated.find((u) => u.tempId === unitTempId);
    if (!found) return;
    setState((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        boundUnitTempId: found.tempId,
        boundUnitId: found.unitId,
        boundOptionId: found.optionId,
      })),
    }));
  };

  const toggleModuleSelected = (tempId: string) => {
    setState((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.tempId === tempId ? { ...m, selected: !m.selected } : m,
      ),
    }));
  };

  const toggleAllModulesSelected = (checked: boolean) => {
    setState((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({ ...m, selected: checked })),
    }));
  };

  const setModuleBoundUnit = (moduleTempId: string, unitTempId: string) => {
    const found = state.unitsCreated.find((u) => u.tempId === unitTempId);
    setState((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => {
        if (m.tempId !== moduleTempId) return m;
        if (unitTempId === "__none__") {
          return {
            ...m,
            boundUnitTempId: null,
            boundUnitId: null,
            boundOptionId: null,
          };
        }
        if (!found) return m;
        return {
          ...m,
          boundUnitTempId: found.tempId,
          boundUnitId: found.unitId,
          boundOptionId: found.optionId,
        };
      }),
    }));
  };

  const handleModuleDrawerSubmit = (payload: {
    moduleId?: string;
    params: ModuleParamsProps | ModuleParamsPropsV2;
    selectedFloors: string[];
    formInput: unknown;
    flatData: TModuleDataV2 & {
      type: TModulesTypes;
      floor_ids?: string[];
      unit_id?: string;
    };
  }) => {
    if (!editingModuleTempId) return;

    const paramsV2 = ((): ModuleParamsPropsV2 | null => {
      const p = payload.params;
      if (p && typeof p === "object" && "type" in p && "data" in p) {
        const typed = p as unknown as ModuleParamsPropsV2;
        if (typeof typed.type === "string") {
          return typed;
        }
      }
      return null;
    })();

    const fallbackType = (paramsV2?.type ??
      payload.flatData.type ??
      "beam_column") as TModulesTypes;

    const dataPayloadFromParams = (paramsV2?.data ??
      payload.flatData) as unknown as Record<string, unknown>;

    setState((prev) => {
      const next = { ...prev };
      next.modules = next.modules.map((m) => {
        if (m.tempId !== editingModuleTempId) return m;

        const originalRawData = (m.raw?.data ?? {}) as unknown as Record<
          string,
          unknown
        >;
        const preservedMeta: Record<string, unknown> = {
          floor_ids: payload.selectedFloors ?? [],
        };
        const originalFloorIndex =
          (originalRawData as unknown as IRawModuleDataWithMeta).floor_index ??
          (m.raw as unknown as IRawModuleDataWithMeta).floor_index;
        if (originalFloorIndex !== undefined && originalFloorIndex !== null) {
          preservedMeta.floor_index = originalFloorIndex;
        }

        const isFoundationType = FOUNDATION_MODULE_TYPES.includes(fallbackType);
        const candidateUnitIdFromParams =
          typeof dataPayloadFromParams.unit_id === "string" &&
          dataPayloadFromParams.unit_id.trim().length >= 5
            ? dataPayloadFromParams.unit_id.trim()
            : undefined;
        const candidateFromOriginal =
          typeof (originalRawData as unknown as IRawModuleDataWithMeta)
            .unit_id === "string" &&
          (originalRawData as unknown as IRawModuleDataWithMeta).unit_id!.trim()
            .length >= 5
            ? (
                originalRawData as unknown as IRawModuleDataWithMeta
              ).unit_id!.trim()
            : undefined;
        const candidateFromBound =
          typeof m.boundUnitId === "string" && m.boundUnitId.trim().length >= 5
            ? m.boundUnitId.trim()
            : undefined;
        const savedUnitId =
          candidateUnitIdFromParams ??
          candidateFromOriginal ??
          candidateFromBound ??
          (isFoundationType ? candidateFromBound : undefined);
        if (savedUnitId) preservedMeta.unit_id = savedUnitId;

        const mergedDataV2: Record<string, unknown> = {
          ...dataPayloadFromParams,
          ...preservedMeta,
        };

        const rawNext: TIfcStepperModuleItem["raw"] = {
          ...m.raw,
          type: fallbackType,
          data: mergedDataV2 as TIfcStepperModuleItem["raw"]["data"],
        };
        if (originalFloorIndex !== undefined && originalFloorIndex !== null) {
          (rawNext as unknown as IRawModuleDataWithMeta).floor_index =
            originalFloorIndex;
        }

        const rebuilt: TIfcStepperModuleItem = {
          ...m,
          raw: rawNext,
          type: fallbackType,
        };
        const flatForRevalidate: TModuleDataV2 & {
          position?: unknown;
          [k: string]: unknown;
        } = {
          ...(mergedDataV2 as unknown as TModuleDataV2),
          type: fallbackType,
          floor_ids: payload.selectedFloors ?? [],
        } as TModuleDataV2 & { [k: string]: unknown };
        const reval = rerunModuleValidation(
          rebuilt,
          i18nCompleteness,
          flatForRevalidate,
        );
        return reval;
      });
      return next;
    });
    setEditingModuleTempId(null);
  };

  // ---------------------------------------------------------------------------
  // Step 2 — Modules helpers (validação desativada — ver AGENTS.md)
  // ---------------------------------------------------------------------------

  // Depois de refatorar forms para V2 ({type,data} wrapper), as validações de
  // módulos são relaxadas por enquanto: bloqueio do submit SÓ por vínculo
  // unidade/opção (bindings). Validações e warnings são ignoradas.

  const selectedModules = state.modules.filter((m) => m.selected);
  const selectedModulesWithBinding = selectedModules.filter(
    (m) => Boolean(m.boundUnitId) && Boolean(m.boundOptionId),
  );
  const countBlockingNoBinding =
    selectedModules.length - selectedModulesWithBinding.length;

  const modulesValidWithBinding = selectedModulesWithBinding;
  const modulesIgnoredCount =
    selectedModules.length - selectedModulesWithBinding.length;
  const modulesUnselectedCount = state.modules.length - selectedModules.length;

  // Submit step 2 só é bloqueado se (a) não houver nenhum selecionado com
  // vínculo OU (b) algum selecionado NÃO tiver vínculo.
  const step2CanProceed =
    countBlockingNoBinding === 0 && selectedModulesWithBinding.length > 0;

  const handleStep2Complete = async () => {
    setStep2Error("");

    // --- DOUBLE CHECK: bloquear submit imediatamente se não cumprir as regras ---
    // Evita race conditions / state desatualizado mesmo quando o botão está disabled.
    if (!step2CanProceed) {
      if (selectedModules.length === 0) {
        toast.warning(
          "Nenhum módulo selecionado para criar. Marque ao menos 1 módulo e vincule a uma unidade.",
        );
      } else if (countBlockingNoBinding > 0) {
        toast.warning(
          `${countBlockingNoBinding} módulo(s) selecionado(s) SEM vínculo de unidade/opção. Vincule as unidades ou desmarque para prosseguir.`,
        );
      } else {
        toast.warning(
          "Nenhum módulo válido selecionado para criar. Marque ao menos 1 módulo válido e com vínculo de unidade.",
        );
      }
      return;
    }

    if (modulesUnselectedCount > 0 && modulesValidWithBinding.length === 0) {
      toast.info(
        `${modulesUnselectedCount} módulo(s) desmarcado(s) — nenhum módulo selecionado válido para criar. Stepper encerrado.`,
      );
      onComplete?.();
      onOpenChange(false);
      return;
    }
    if (modulesValidWithBinding.length === 0) {
      toast.warning(
        "Nenhum módulo com vinculo de unidade para criar. Stepper encerrado.",
      );
      onComplete?.();
      onOpenChange(false);
      return;
    }
    setIsCreatingStep2(true);

    const groups = new Map<
      string,
      { unit: TIfcStepperCreatedUnit; modules: TIfcStepperModuleItem[] }
    >();
    for (const mod of modulesValidWithBinding) {
      const key = `${mod.boundUnitId}__${mod.boundOptionId}`;
      const unit = state.unitsCreated.find(
        (u) => u.unitId === mod.boundUnitId && u.optionId === mod.boundOptionId,
      );
      if (!unit) continue;
      if (!groups.has(key)) groups.set(key, { unit, modules: [] });
      groups.get(key)!.modules.push(mod);
    }

    const errors: string[] = [];
    let createdCount = 0;

    try {
      for (const { unit, modules: groupModules } of groups.values()) {
        const payloadModules: ModuleParamsPropsV2[] = [];
        const towerFloorsForGroup =
          normalizedUnitsFloorMap.get(unit.tempId) ?? [];
        for (const m of groupModules) {
          const isFoundation = FOUNDATION_MODULE_TYPES.includes(
            m.type as TModulesTypes,
          );
          // Prefere floor_ids já salvos (ex.: usuário editou e mudou via BuildingVisualizer)
          // senão mapeia a partir do floor_index numérico original vindo do IFC
          const resolvedFloorIds =
            (m.raw?.data as unknown as IRawModuleDataWithMeta)?.floor_ids &&
            Array.isArray(
              (m.raw.data as unknown as IRawModuleDataWithMeta).floor_ids,
            ) &&
            (m.raw.data as unknown as IRawModuleDataWithMeta).floor_ids!
              .length > 0
              ? ((m.raw.data as unknown as IRawModuleDataWithMeta)
                  .floor_ids as string[])
              : mapFloorIndexToFloorIds(
                  (m.raw?.data as unknown as IRawModuleDataWithMeta)
                    ?.floor_index,
                  towerFloorsForGroup,
                );
          const binding = isFoundation
            ? ({ unit_id: unit.unitId } as IModuleBatchBinding)
            : ({ floor_ids: resolvedFloorIds } as IModuleBatchBinding);
          const prepared = prepareModuleForBatch(m, isFoundation, binding);
          if (!prepared) continue;
          payloadModules.push(prepared as unknown as ModuleParamsPropsV2);
        }
        if (payloadModules.length === 0) continue;
        try {
          const res = await postModulesBatch(
            { modules: payloadModules },
            projectId,
            unit.unitId,
            unit.optionId,
          );
          createdCount += (res.data.modules ?? []).length;
        } catch (err) {
          const msg = parseApiError(err, t);
          errors.push(`${unit.displayName}: ${msg}`);
        }
      }

      if (errors.length > 0) {
        setStep2Error(errors.join(" | "));
        toast.error(
          `${createdCount} módulo(s) criado(s). ${errors.length} lote(s) falhou(ram).`,
          {
            description: errors[0],
          },
        );
      } else {
        toast.success(`${createdCount} módulo(s) criado(s) com sucesso.`);
      }
      if (modulesIgnoredCount > 0 || modulesUnselectedCount > 0) {
        const parts: string[] = [];
        if (modulesIgnoredCount > 0)
          parts.push(
            `${modulesIgnoredCount} selecionado(s) mas sem vinculo/inválidos`,
          );
        if (modulesUnselectedCount > 0)
          parts.push(`${modulesUnselectedCount} desmarcado(s)`);
        toast.info(`${parts.join(" · ")} — não serão criados.`);
      }

      // Invalidate queries
      await queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["units", projectId],
      });
      for (const u of state.unitsCreated) {
        await queryClient.invalidateQueries({
          queryKey: ["unit", projectId, u.unitId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["options", projectId, u.unitId],
        });
      }

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      const msg = parseApiError(err, t);
      setStep2Error(msg);
      toast.error("Falha ao criar módulos.", { description: msg });
    } finally {
      setIsCreatingStep2(false);
    }
  };

  const handleClose = () => {
    if (isCreatingStep1 || isCreatingStep2) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[78vw] w-[78vw] h-[85vh] max-h-[85vh] flex flex-col gap-0 overflow-hidden p-4">
        <StepperHeader
          isSimulationMode={isSimulationMode}
          fileName={fileName ?? null}
          translations={translations}
          activeStep={activeStep}
          steps={steps}
          selectedSimulationOptionId={selectedSimulationOptionId}
          availableOptions={availableOptions}
          setSelectedSimulationOptionId={setSelectedSimulationOptionId}
          preselectedUnitId={preselectedUnitId}
          initialRoleId={initialRoleId}
          projectId={projectId}
          refetchOptions={refetchOptions as () => Promise<unknown>}
          queryClient={queryClient}
          state={state}
          applyUnitToAllModules={applyUnitToAllModules}
        />

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          <Step1Content
            translations={translations}
            state={state}
            toggleUnitSelected={toggleUnitSelected}
            setUnitNameInline={setUnitNameInline}
            onEditUnit={(tempId) => setEditingUnitTempId(tempId)}
            step1Error={step1Error}
            isSimulationMode={isSimulationMode}
            activeStep={activeStep}
          />
          <Step2Content
            translations={translations}
            state={state}
            setModuleBoundUnit={setModuleBoundUnit}
            onEditModule={(tempId) => setEditingModuleTempId(tempId)}
            toggleModuleSelected={toggleModuleSelected}
            toggleAllModulesSelected={toggleAllModulesSelected}
            moduleTypeLabels={{
              ...MODULE_TYPE_LABEL_FALLBACK,
              ...structureTypes(translations),
            }}
            step2Error={step2Error}
            isSimulationMode={isSimulationMode}
            activeStep={activeStep}
          />
        </div>

        <DialogFooter className="px-4 py-2 border-t gap-2 shrink-0">
          {!isSimulationMode && activeStep === 0 && (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isCreatingStep1}
              >
                Cancelar
              </Button>
              <Button
                variant="bipc"
                onClick={handleStep1CreateAndNext}
                disabled={!step1CanProceed || isCreatingStep1}
                className="text-white"
              >
                {isCreatingStep1 ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando unidades...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Próximo passo
                    <Wand2 className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </>
          )}
          {!isSimulationMode && activeStep === 1 && (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isCreatingStep2}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={goToStep1}
                disabled={isCreatingStep2}
              >
                Voltar
              </Button>
              <Button
                variant="bipc"
                onClick={handleStep2Complete}
                disabled={isCreatingStep2 || !step2CanProceed}
                className="text-white"
                title={
                  !step2CanProceed && countBlockingNoBinding > 0
                    ? `${countBlockingNoBinding} módulo(s) selecionado(s) sem vínculo de unidade/opção — vincule ou desmarque para prosseguir.`
                    : undefined
                }
              >
                {isCreatingStep2 ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando módulos...
                  </span>
                ) : (
                  "Concluir"
                )}
              </Button>
            </>
          )}
          {isSimulationMode && (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isCreatingStep2}
              >
                Cancelar
              </Button>
              <Button
                variant="bipc"
                onClick={handleStep2Complete}
                disabled={
                  isCreatingStep2 ||
                  !selectedSimulationOptionId ||
                  !step2CanProceed
                }
                className="text-white"
                title={
                  !step2CanProceed && countBlockingNoBinding > 0
                    ? `${countBlockingNoBinding} módulo(s) selecionado(s) sem vínculo de unidade/opção — vincule ou desmarque para prosseguir.`
                    : undefined
                }
              >
                {isCreatingStep2 ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando módulos...
                  </span>
                ) : (
                  "Concluir"
                )}
              </Button>
            </>
          )}
        </DialogFooter>

        {editingUnit && (
          <DrawerFormUnit
            stepperMode
            projectId={projectId}
            open={!!editingUnitTempId}
            onOpenChange={(o) => !o && setEditingUnitTempId(null)}
            initialFormData={
              editingUnit.formData as unknown as TIfcStepperUnitItem["formData"]
            }
            onSubmitSuccess={handleUnitDrawerSubmit}
          />
        )}

        {editingModule && (
          <DrawerFormModule
            stepperMode
            projectId={projectId}
            unitId={editingModuleBoundUnit?.unitId}
            optionId={editingModuleBoundUnit?.optionId}
            type={(editingModule.type as TModulesTypes) ?? "beam_column"}
            floors={editingUnitFloors}
            open={!!editingModuleTempId}
            onOpenChange={(o) => !o && setEditingModuleTempId(null)}
            initialModuleData={{
              type: (editingModule.type as TModulesTypes) ?? "beam_column",
              data:
                (editingModuleInitialMerged as unknown as {
                  [k: string]: unknown;
                  floor_ids?: string[];
                  unit_id?: string;
                }) ?? {},
            }}
            initialSelectedFloors={editingModuleInitialSelectedFloors}
            onSubmitSuccess={(payload) => {
              if (!editingModuleBoundUnit) {
                toast.warning(translations.stepper.modules.notBoundWarning);
                return;
              }
              handleModuleDrawerSubmit(payload);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
