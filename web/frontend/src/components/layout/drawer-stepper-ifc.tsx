import { postModulesBatch } from "@/actions/modules/postModulesBatch";
import { postOption } from "@/actions/options/postOption";
import { getOptions } from "@/actions/options/getOptions";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { postUnit } from "@/actions/units/postUnit";
import { patchUnit } from "@/actions/units/patchUnit";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { DialogCreateSimulation } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";
import { IProject } from "@/types/projects";
import { TOption } from "@/types/options";
import { TTowerFloorCategory, IUnit } from "@/types/units";
import {
  FOUNDATION_MODULE_TYPES,
  ModuleParamsProps,
  ModuleParamsPropsV2,
  TModulesTypes,
  TModuleDataV2,
} from "@/types/modules";
import {
  TIfcProcessorAggregatedResult,
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
  IGetUnitByUUIDCachedResponse,
  TEditingModuleMerged,
  IModuleBatchBinding,
  DrawerStepperIFCProps,
} from "@/types/ifc";
import { useFloorIndexMappings } from "@/hooks/useFloorIndexMappings";
import { structureTypes } from "@/utils/structureTypes";
import type { IFCAccessMode } from "@/components/layout/drawer-ifc-import";
import { parseApiError } from "@/utils/parseApiError";
import {
  convertFloorFormInputToTowerFloors,
  mapFloorIndexToFloorIds,
} from "@/utils/unitConversions";
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
import {
  CompletenessWarningsI18n,
  flatV2ToGroupedForm,
  TModuleGroupedForm,
} from "@/components/layout/drawer-form-module/aggregate-helpers";
import { UnitFormInput, UnitFormSchema } from "@/validators/unitForm.validator";
import { ModuleFormState } from "@/validators/moduleFormByType.validator";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Edit2,
  FileText,
  Info,
  Loader2,
  Plus,
  Wand2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DrawerFormModule from "./drawer-form-module";
import DrawerFormUnit from "./drawer-form-unit";
import { Step1UnitsView } from "./drawer-stepper-ifc/views/Step1UnitsView";
import { Step2ModulesView } from "./drawer-stepper-ifc/views/Step2ModulesView";
import { StepperHeader } from "./drawer-stepper-ifc/views/StepperHeader";
import { Step1Content } from "./drawer-stepper-ifc/views/Step1Content";
import { Step2Content } from "./drawer-stepper-ifc/views/Step2Content";

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
    formInput: ModuleFormState;
    flatData: TModuleDataV2 & {
      type: TModulesTypes;
      floor_ids?: string[];
      unit_id?: string;
    };
  }) => {
    if (!editingModuleTempId) return;

    // --- CONVERSÃO OBRIGATÓRIA: flatData (FLAT schema) → grouped (SCHEMA FORMATO) ---
    // Motivo: rerunModuleValidation internamente roda moduleFormSchema.safeParse(),
    // que espera dados NO FORMATO GROUPED (ex: concrete_columns.volumes / steel / etc),
    // NÃO no formato flat (ex: concrete.column[]).
    // Sem essa conversão, raw.data fica com flat, schema falha e aparece "2 erros"
    // mesmo com tudo preenchido corretamente pelo usuário.
    const groupedForRaw = flatV2ToGroupedForm(
      payload.flatData.type,
      payload.flatData as unknown as Partial<TModuleDataV2> & {
        [k: string]: unknown;
      },
    );

    setState((prev) => {
      const next = { ...prev };
      next.modules = next.modules.map((m) => {
        if (m.tempId !== editingModuleTempId) return m;

        // grouped NOVO completo, preservando metadados do módulo
        // (floor_ids / floor_index / unit_id) que flatV2ToGroupedForm
        // NÃO repassa — pois eles não são campos do form Raft/Pórtico/etc.
        const preservedMeta: Record<string, unknown> = {
          // ⬇️ OBRIGATÓRIO: DrawerFormModule lê raw.data.floor_ids
          //     para pre-encher selectedFloors (BuildingVisualizer checkboxes)
          floor_ids: payload.selectedFloors ?? [],
          // ⬇️ Preserva floor_index ORIGINAL do IFC (backup caso floor_ids vazio)
          ...((m.raw.data as unknown as IRawModuleDataWithMeta)?.floor_index !==
          undefined
            ? {
                floor_index: (m.raw.data as unknown as IRawModuleDataWithMeta)
                  .floor_index,
              }
            : {}),
          ...(m.raw.floor_index !== undefined
            ? { floor_index: m.raw.floor_index }
            : {}),
        };
        // unit_id: prioriza payload.flatData.unit_id (vinculado do drawer),
        // senão preserva o que já tinha em grouped ou raw.
        // Valida: fundação (raft/piles/raft_piles) usa unit_id UUID; pórtico/etc
        // pode vir com floor_ids e unit_id vazio. Fallback cascata até boundUnitId.
        const isFoundationType = FOUNDATION_MODULE_TYPES.includes(
          payload.flatData.type as TModulesTypes,
        );
        const candidateFlat =
          typeof payload.flatData.unit_id === "string" &&
          payload.flatData.unit_id.trim().length >= 5
            ? payload.flatData.unit_id.trim()
            : undefined;
        const candidateGrouped =
          typeof (groupedForRaw as unknown as IRawModuleDataWithMeta)
            .unit_id === "string" &&
          (groupedForRaw as unknown as IRawModuleDataWithMeta).unit_id!.trim()
            .length >= 5
            ? (
                groupedForRaw as unknown as IRawModuleDataWithMeta
              ).unit_id!.trim()
            : undefined;
        const candidateRawData =
          typeof (m.raw.data as unknown as IRawModuleDataWithMeta)?.unit_id ===
            "string" &&
          (m.raw.data as unknown as IRawModuleDataWithMeta)?.unit_id!.trim()
            .length >= 5
            ? (m.raw.data as unknown as IRawModuleDataWithMeta)?.unit_id!.trim()
            : undefined;
        const candidateBound =
          typeof m.boundUnitId === "string" && m.boundUnitId.trim().length >= 5
            ? m.boundUnitId.trim()
            : undefined;
        const savedUnitId =
          candidateFlat ??
          candidateGrouped ??
          candidateRawData ??
          candidateBound ??
          (isFoundationType ? candidateBound : undefined);
        if (savedUnitId) preservedMeta.unit_id = savedUnitId;

        const groupedComMeta = {
          ...groupedForRaw,
          ...preservedMeta,
        } as TEditingModuleMerged;

        const rawNext = {
          ...m.raw,
          type: payload.flatData.type,
          data: groupedComMeta,
          // ⬇️ Também garante floor_index no NÍVEL raw (não só data) para
          //     fallback normalizedUnitsFloorMap (5 camadas)
          ...(m.raw.floor_index !== undefined
            ? { floor_index: m.raw.floor_index }
            : (m.raw.data as unknown as IRawModuleDataWithMeta)?.floor_index !==
                undefined
              ? {
                  floor_index: (m.raw.data as unknown as IRawModuleDataWithMeta)
                    .floor_index,
                }
              : {}),
        };
        const rebuilt = { ...m, raw: rawNext, type: payload.flatData.type };
        const reval = rerunModuleValidation(
          rebuilt,
          i18nCompleteness,
          payload.flatData as unknown as TModuleDataV2 & {
            position?: unknown;
            [k: string]: unknown;
          },
        );
        return reval;
      });
      return next;
    });
    setEditingModuleTempId(null);
  };

  // ---- Helpers de validação CRITERIOSA de cada módulo para o submit ----
  // Um módulo SÓ pode ser submetido se cumprir TODOS os requisitos abaixo:
  //  (a) Tem schema válido (isValid)
  //  (b) NÃO tem validationErrors (erros de form / obrigatórios ausentes)
  //  (c) NÃO tem completenessWarnings (campos recomendados ausentes)
  //  (d) Tem vínculo com unidade E opção (boundUnitId + boundOptionId)
  //
  // Qualquer módulo SELECIONADO que falhe em UM dos 4 itens BLOQUEIA o botão.
  const isModuleStrictValid = (m: TIfcStepperModuleItem): boolean => {
    return (
      m.isValid === true &&
      Array.isArray(m.validationErrors) &&
      m.validationErrors.length === 0 &&
      Boolean(m.completenessWarnings) &&
      m.completenessWarnings.hasWarnings === false &&
      Boolean(m.boundUnitId) &&
      Boolean(m.boundOptionId)
    );
  };

  // Contagens específicas por tipo de bloqueio (para mostrar no alert / tooltip)
  const getBlockingReasons = (m: TIfcStepperModuleItem): string[] => {
    const reasons: string[] = [];
    if (!m.isValid) reasons.push("inválido");
    if (m.validationErrors?.length > 0)
      reasons.push(
        `${m.validationErrors.length} ${
          m.validationErrors.length === 1 ? "erro" : "erros"
        }`,
      );
    if (m.completenessWarnings?.hasWarnings)
      reasons.push(
        `${m.completenessWarnings.messages?.length ?? 1} ${
          (m.completenessWarnings.messages?.length ?? 1) === 1
            ? "aviso"
            : "avisos"
        }`,
      );
    if (!m.boundUnitId || !m.boundOptionId)
      reasons.push("sem unidade vinculada");
    return reasons;
  };

  const selectedModules = state.modules.filter((m) => m.selected);
  const selectedModulesWithBlocking = selectedModules.filter(
    (m) => !isModuleStrictValid(m),
  );
  const selectedModulesStrictValid =
    selectedModules.filter(isModuleStrictValid);

  // Contagens de bloqueio por motivo (para o alert explicativo)
  const countBlockingErrors = selectedModulesWithBlocking.filter(
    (m) => !m.isValid || (m.validationErrors?.length ?? 0) > 0,
  ).length;
  const countBlockingWarnings = selectedModulesWithBlocking.filter(
    (m) => m.completenessWarnings?.hasWarnings === true,
  ).length;
  const countBlockingNoBinding = selectedModulesWithBlocking.filter(
    (m) => !m.boundUnitId || !m.boundOptionId,
  ).length;

  // Helper antigo preservado (mantém onde for usado para counts de toast etc):
  const modulesValidWithBinding = selectedModulesStrictValid;
  const modulesIgnoredCount =
    selectedModules.length - selectedModulesStrictValid.length;
  const modulesUnselectedCount = state.modules.length - selectedModules.length;

  // Define SE o botão de concluir deve estar desativado.
  // Regra: botão só habilita quando TODOS os módulos SELECIONADOS são estritamente válidos.
  // Também desativa se não houver nenhum módulo selecionado válido para criar.
  const step2CanProceed =
    selectedModulesWithBlocking.length === 0 &&
    selectedModulesStrictValid.length > 0;

  const handleStep2Complete = async () => {
    setStep2Error("");

    // --- DOUBLE CHECK: bloquear submit imediatamente se houver módulos SELECIONADOS com problema ---
    // Evita race conditions / state desatualizado mesmo quando o botão está disabled.
    if (!step2CanProceed) {
      if (selectedModulesWithBlocking.length > 0) {
        toast.warning(
          `${selectedModulesWithBlocking.length} módulo(s) selecionado(s) com problema (erros/avisos/sem unidade). Corrija ou desmarque antes de prosseguir.`,
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
        "Nenhum módulo válido e com vinculo de unidade para criar. Stepper encerrado.",
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
      <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[85vh] max-h-[85vh] flex flex-col gap-0 overflow-hidden p-4">
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
            selectedModulesWithBlocking={selectedModulesWithBlocking}
            countBlockingErrors={countBlockingErrors}
            countBlockingWarnings={countBlockingWarnings}
            countBlockingNoBinding={countBlockingNoBinding}
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
                  !step2CanProceed && selectedModulesWithBlocking.length > 0
                    ? `${selectedModulesWithBlocking.length} módulo(s) selecionado(s) com problema — corrija ou desmarque para prosseguir.`
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
                  !step2CanProceed && selectedModulesWithBlocking.length > 0
                    ? `${selectedModulesWithBlocking.length} módulo(s) selecionado(s) com problema — corrija ou desmarque para prosseguir.`
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
            source="ifc"
            open={!!editingModuleTempId}
            onOpenChange={(o) => !o && setEditingModuleTempId(null)}
            initialModuleData={
              editingModuleInitialMerged as unknown as TEditingModuleMerged
            }
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
