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
import { IProject } from "@/types/projects";
import { TModulesTypes } from "@/types/modules";
import { TOption } from "@/types/options";
import { TTowerFloorCategory } from "@/types/units";
import {
  TIfcProcessorAggregatedResult,
  TIfcStepperCreatedUnit,
  TIfcStepperModuleItem,
  TIfcStepperState,
  TIfcStepperUnitItem,
} from "@/types/ifc";
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
import { CompletenessWarningsI18n } from "@/components/layout/drawer-form-module/aggregate-helpers";
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
import {
  ModuleParamsProps,
  ModuleParamsPropsV2,
  TModuleDataV2,
} from "@/types/modules";

const FOUNDATION_MODULE_TYPES: TModulesTypes[] = [
  "raft_foundation",
  "piles_foundation",
  "raft_piles_foundation",
];

const moduleTypeLabels: Record<TModulesTypes | string, string> = {
  beam_column: "Pórtico (Viga/Pilar)",
  concrete_wall: "Parede de Concreto",
  structural_masonry: "Alvenaria Estrutural",
  raft_foundation: "Fundação: Radier",
  piles_foundation: "Fundação: Estacas",
  raft_piles_foundation: "Fundação: Radier + Estacas",
  ...MODULE_TYPE_LABEL_FALLBACK,
};

interface DrawerStepperIFCProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialResult: TIfcProcessorAggregatedResult;
  initialRoleId: string;
  mode: IFCAccessMode;
  preselectedUnitId?: string;
  preselectedOptionId?: string;
  fileName?: string | null;
  onComplete?: () => void;
}

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
  const i18nCompleteness = (t as any).modules?.form
    ?.completeness as CompletenessWarningsI18n;

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
  const availableOptions: TOption[] = (optionsData?.data as any)?.options ?? [];

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
    const base = mapIfcResultToStepperState(initialResult, t as any);
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
          label: t.stepper.stepModules,
          description: t.stepper.stepSimulationModulesDescription,
        },
      ]
    : [
        {
          id: "units",
          label: t.stepper.stepUnits,
          description: t.stepper.stepUnitsDescription,
        },
        {
          id: "modules",
          label: t.stepper.stepModules,
          description: t.stepper.stepModulesDescription,
        },
      ];

  const editingUnit = state.units.find((u) => u.tempId === editingUnitTempId);
  const editingModule = state.modules.find(
    (m) => m.tempId === editingModuleTempId,
  );

  // editingModuleBoundUnit pode vir de 3 fontes:
  //  1) state.unitsCreated.find (unidade enviada p/ backend ou simulation via useEffect)
  //  2) state.units.find (modo normal, unidade ainda não criada, apenas em edição)
  //     (cria um TIfcStepperStateUnitsCreated placeholder para os fallbacks de floors)
  //  3) Modo simulation: fallback direto para simulationCreatedUnit se tivermos
  //     editingModule.boundUnitTempId mas ele não existe em unitsCreated ainda
  //     (janela de corrida de render entre query e useEffect setUnitsCreated)
  //
  // IMPORTANTE: USEMEMO OBRIGATÓRIO — se retornar objeto literal novo a cada render,
  // o useMemo editingUnitFloors calcula de novo a cada render → referência nova
  // para DrawerFormModule → loop infinito no filho.
  const editingModuleBoundUnit = useMemo<
    TIfcStepperCreatedUnit | undefined
  >(() => {
    if (!editingModule?.boundUnitTempId) return undefined;
    const tempId = editingModule.boundUnitTempId;
    const inCreated = state.unitsCreated.find((u) => u.tempId === tempId);
    if (inCreated) return inCreated;

    const inStateUnits = state.units.find((u) => u.tempId === tempId);
    if (inStateUnits) {
      return {
        tempId: inStateUnits.tempId,
        unitName: inStateUnits.name ?? "",
        optionId: null,
        unitId: null,
        reusedExisting: false,
      } as unknown as TIfcStepperCreatedUnit;
    }

    if (isSimulationMode && simulationCreatedUnit) {
      return simulationCreatedUnit;
    }
    return undefined;
  }, [
    editingModule?.boundUnitTempId,
    state.unitsCreated,
    state.units,
    isSimulationMode,
    simulationCreatedUnit,
  ]);

  // Map: tempId (da unitsCreated / simulationBoundUnitTempId) → TTowerFloorCategory[]
  // Para cada unidade criada/criando, converte os floors do state para o formato
  // TTowerFloorCategory que é esperado por BuildingVisualizer / DrawerFormModule.
  // Permite mapear floor_index numérico do IFC → floor_ids UUIDs para POST / batch.
  //
  // Estratégia de resolução (ordem de fallback):
  //  A. Modo simulation + tempId = simulationBoundUnitTempId → usa a query da unidade
  //  B. Match exato em state.units[i].tempId === unitCreated.tempId (modo normal)
  //  C. Match por unitName em state.units[i].name (fallback por nome)
  //  D. Cache do queryClient ["unit", projectId, unitId] para unidades já existentes
  //  E. Para TODOS state.units (se modo normal) inclui mesmo que não estejam em
  //     unitsCreated ainda (evita vazio se usuário editar módulo antes do create step 1)
  const normalizedUnitsFloorMap: Map<string, TTowerFloorCategory[]> =
    useMemo(() => {
      const map = new Map<string, TTowerFloorCategory[]>();
      for (const unitCreated of state.unitsCreated) {
        let floors: TTowerFloorCategory[] = [];
        const tempId = unitCreated.tempId;

        // (A) Simulation mode, usa query getUnitByUUID
        if (isSimulationMode && tempId === simulationBoundUnitTempId) {
          const f = simulationUnitData?.data?.unit?.floors;
          if (f && f.length > 0) {
            floors = f as TTowerFloorCategory[];
          }
        }

        // (B) Direto do state.units por tempId match exato
        if (floors.length === 0) {
          const unitState = state.units.find((u) => u.tempId === tempId);
          const rawFloors = unitState?.formData?.data?.floors ?? [];
          if (rawFloors.length > 0) {
            floors = convertFloorFormInputToTowerFloors(rawFloors as any[]);
          }
        }

        // (C) Fallback por state.units usando unitName como referência
        if (floors.length === 0 && unitCreated.unitName) {
          const unitState = state.units.find(
            (u) => u.name && u.name === unitCreated.unitName,
          );
          const rawFloors = unitState?.formData?.data?.floors ?? [];
          if (rawFloors.length > 0) {
            floors = convertFloorFormInputToTowerFloors(rawFloors as any[]);
          }
        }

        // (D) Fallback por queryClient cache (getUnitByUUID já realizada)
        if (floors.length === 0 && unitCreated.unitId && !isSimulationMode) {
          try {
            const cached = queryClient.getQueryData([
              "unit",
              projectId,
              unitCreated.unitId,
            ]) as any;
            const cachedFloors = cached?.data?.unit?.floors;
            if (cachedFloors && Array.isArray(cachedFloors)) {
              floors = cachedFloors as TTowerFloorCategory[];
            }
          } catch (_e) {
            /* ignore */
          }
        }

        map.set(tempId, floors);
      }

      // (E) Garante state.units inteiro no map (modo normal)
      if (!isSimulationMode && state.units.length > 0) {
        for (const unitState of state.units) {
          if (map.has(unitState.tempId)) continue;
          const rawFloors = unitState.formData?.data?.floors ?? [];
          if (rawFloors.length === 0) {
            map.set(unitState.tempId, []);
            continue;
          }
          const tower = convertFloorFormInputToTowerFloors(rawFloors as any[]);
          map.set(unitState.tempId, tower);
        }
      }

      return map;
    }, [
      state.unitsCreated,
      state.units,
      isSimulationMode,
      simulationBoundUnitTempId,
      simulationUnitData,
      queryClient,
      projectId,
    ]);

  // Floors da unidade que está ligada ao módulo atualmente em edição
  //
  // IMPORTANTE: DEVE ser useMemo (não IIFE). Se não for memoizado, retorna
  // referência de array nova a cada render → propagação de novas refs para
  // DrawerFormModule → useEffects filhos executam de novo → form.reset /
  // form.trigger → re-render → referência nova → LOOP INFINITO.
  const editingUnitFloors: TTowerFloorCategory[] = useMemo(() => {
    if (!editingModuleBoundUnit) {
      const firstWithFloors = Array.from(normalizedUnitsFloorMap.values()).find(
        (arr) => arr.length > 0,
      );
      return firstWithFloors ?? [];
    }
    const tempId = editingModuleBoundUnit.tempId;
    const fromMap = normalizedUnitsFloorMap.get(tempId);
    if (fromMap && fromMap.length > 0) return fromMap;

    if (editingModuleBoundUnit.unitId) {
      if (editingModuleBoundUnit.unitName) {
        const unitState = state.units.find(
          (u) => u.name === editingModuleBoundUnit!.unitName,
        );
        const raw = unitState?.formData?.data?.floors ?? [];
        if (raw.length > 0) {
          return convertFloorFormInputToTowerFloors(raw as any[]);
        }
      }
      try {
        const cached = queryClient.getQueryData([
          "unit",
          projectId,
          editingModuleBoundUnit.unitId,
        ]) as any;
        const cachedFloors = cached?.data?.unit?.floors;
        if (
          cachedFloors &&
          Array.isArray(cachedFloors) &&
          cachedFloors.length > 0
        ) {
          return cachedFloors as TTowerFloorCategory[];
        }
      } catch (_e) {
        /* ignore */
      }
    }
    return fromMap ?? [];
  }, [
    editingModuleBoundUnit,
    normalizedUnitsFloorMap,
    state.units,
    queryClient,
    projectId,
  ]);

  // Converte o `floor_index: number` (singular) do raw.data do módulo IFC
  // para `floor_ids: string[]` (UUIDs dos pavimentos correspondentes).
  const editingModuleInitialSelectedFloors: string[] = useMemo(() => {
    if (!editingModule) return [];
    const rawIndex = (editingModule.raw?.data as any)?.floor_index;
    return mapFloorIndexToFloorIds(rawIndex, editingUnitFloors);
  }, [editingModule, editingUnitFloors]);

  // Dados merged do initialModuleData passados para o DrawerFormModule:
  // inclui raw.data original E também `floor_ids` já mapeados (fallback caso
  // initialSelectedFloors seja ignorado).
  const editingModuleInitialMerged: any = useMemo(() => {
    if (!editingModule?.raw?.data) return {} as any;
    return {
      ...(editingModule.raw.data as any),
      floor_ids: editingModuleInitialSelectedFloors,
    };
  }, [editingModule, editingModuleInitialSelectedFloors]);

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
        return rerunUnitValidation(updated, t as any);
      });
      return next;
    });
  };

  const handleUnitDrawerSubmit = (payload: {
    unitId?: string;
    data: UnitFormSchema;
    formInput: UnitFormInput;
    unit: any;
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
        return rerunUnitValidation(updated, t as any);
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
            const updatePayload = prepareUnitForCreate(unit.formData);
            const patchRes = await patchUnit(
              updatePayload as any,
              projectId,
              alreadyCreated.unitId,
            );
            const patchBody: any = (patchRes as any).data;
            const updatedUnitObj: any =
              (patchBody as any)?.unit ?? (patchBody as any)?.data?.unit;
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

        const createPayload = prepareUnitForCreate(unit.formData);
        const unitRes = await postUnit(createPayload as any, projectId);
        const unitBody: any = (unitRes as any).data;
        const unitObj: any =
          (unitBody as any)?.unit ?? (unitBody as any)?.data?.unit;
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
        const optionBody: any = (optionRes as any).data;
        const optionObj: any =
          (optionBody as any)?.option ??
          (optionBody as any)?.data?.option ??
          (optionBody as any)?.tower_option ??
          (optionBody as any)?.data?.tower_option;
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
    setState((prev) => {
      const next = { ...prev };
      next.modules = next.modules.map((m) => {
        if (m.tempId !== editingModuleTempId) return m;
        const rawNext = {
          ...m.raw,
          type: payload.flatData.type,
          data: { ...(m.raw.data ?? {}), ...(payload.flatData as any) },
        };
        const rebuilt = { ...m, raw: rawNext, type: payload.flatData.type };
        return rerunModuleValidation(rebuilt, i18nCompleteness);
      });
      return next;
    });
    setEditingModuleTempId(null);
  };

  const selectedModules = state.modules.filter((m) => m.selected);
  const modulesValidWithBinding = selectedModules.filter(
    (m) => m.isValid && m.boundUnitId && m.boundOptionId,
  );
  const modulesIgnoredCount =
    selectedModules.length - modulesValidWithBinding.length;
  const modulesUnselectedCount = state.modules.length - selectedModules.length;

  const handleStep2Complete = async () => {
    setStep2Error("");
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
        const payloadModules: ModuleParamsProps[] = [];
        const towerFloorsForGroup =
          normalizedUnitsFloorMap.get(unit.tempId) ?? [];
        for (const m of groupModules) {
          const isFoundation = FOUNDATION_MODULE_TYPES.includes(
            m.type as TModulesTypes,
          );
          // Prefere floor_ids já salvos (ex.: usuário editou e mudou via BuildingVisualizer)
          // senão mapeia a partir do floor_index numérico original vindo do IFC
          const resolvedFloorIds =
            (m.raw?.data as any)?.floor_ids &&
            Array.isArray((m.raw.data as any).floor_ids) &&
            (m.raw.data as any).floor_ids.length > 0
              ? ((m.raw.data as any).floor_ids as string[])
              : mapFloorIndexToFloorIds(
                  (m.raw?.data as any)?.floor_index,
                  towerFloorsForGroup,
                );
          const binding = isFoundation
            ? { unit_id: unit.unitId }
            : { floor_ids: resolvedFloorIds };
          const prepared = prepareModuleForBatch(
            m,
            isFoundation,
            binding as any,
          );
          if (!prepared) continue;
          payloadModules.push(prepared as any);
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
        <DialogHeader className="px-4 pt-2 pb-3 border-b">
          <DialogTitle className="text-xl font-bold text-primary">
            {isSimulationMode
              ? (t.stepper?.simulation?.title ?? "Importar módulos do IFC")
              : "Importar dados do IFC"}
          </DialogTitle>
          <DialogDescription>
            {isSimulationMode
              ? (t.stepper?.simulation?.description ??
                "Selecione uma simulação existente para adicionar os módulos extraídos do IFC.")
              : "Valide unidades e módulos extraídos do arquivo IFC antes de criar."}
          </DialogDescription>

          {fileName ? (
            <div className="mt-3 inline-flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-sm px-3 py-1.5 gap-2 max-w-full overflow-hidden text-ellipsis whitespace-nowrap shadow-sm"
                title={fileName}
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[60ch]">
                  {fileName}
                </span>
              </Badge>
            </div>
          ) : null}

          <div className="pt-4">
            <Stepper activeStep={activeStep} steps={steps} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {isSimulationMode && (
            <div className="mb-4 border-2 border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/40 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <label className="text-sm font-medium text-foreground">
                    {t.stepper?.simulation?.selectLabel ??
                      "Simulação alvo (onde os módulos serão criados)"}
                  </label>
                  <Select
                    value={selectedSimulationOptionId ?? ""}
                    onValueChange={(v) => setSelectedSimulationOptionId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          availableOptions.length === 0
                            ? (t.stepper?.simulation?.noOptions ??
                              "Nenhuma simulação cadastrada")
                            : (t.stepper?.simulation?.selectPlaceholder ??
                              "Selecione uma simulação")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.length === 0 && (
                        <div className="text-sm px-2 py-3 text-muted-foreground">
                          {t.stepper?.simulation?.noOptionsHint ??
                            "Crie uma nova simulação primeiro."}
                        </div>
                      )}
                      {availableOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                          {o.active ? (
                            <span className="ml-2 text-xs text-primary font-medium">
                              (ativa)
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {preselectedUnitId && initialRoleId ? (
                  <DialogCreateSimulation
                    projectId={projectId}
                    unitId={preselectedUnitId}
                    roleId={initialRoleId}
                    triggerComponent={
                      <Button variant="outline">
                        <Plus className="h-4 w-4" />{" "}
                        {t.stepper?.simulation?.createNew ??
                          "Criar nova simulação"}
                      </Button>
                    }
                    onCreated={() => {
                      void refetchOptions();
                      void queryClient.invalidateQueries({
                        queryKey: ["options", projectId, preselectedUnitId],
                      });
                    }}
                  />
                ) : null}
              </div>
              {!selectedSimulationOptionId ? (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {t.stepper?.simulation?.requiredHint ??
                        "Selecione ou crie uma simulação antes de prosseguir."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {!isSimulationMode && activeStep === 0 && (
            <Step1UnitsView
              state={state}
              toggleUnitSelected={toggleUnitSelected}
              setUnitNameInline={setUnitNameInline}
              onEditUnit={(tempId) => setEditingUnitTempId(tempId)}
              t={t}
            />
          )}
          {activeStep === (isSimulationMode ? 0 : 1) && (
            <Step2ModulesView
              state={state}
              applyUnitToAllModules={applyUnitToAllModules}
              setModuleBoundUnit={setModuleBoundUnit}
              onEditModule={(tempId) => setEditingModuleTempId(tempId)}
              toggleModuleSelected={toggleModuleSelected}
              toggleAllModulesSelected={toggleAllModulesSelected}
              moduleTypeLabels={moduleTypeLabels}
              t={t}
            />
          )}

          {step1Error && !isSimulationMode && activeStep === 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {step1Error}
                </p>
              </div>
            </div>
          )}
          {step2Error && activeStep === (isSimulationMode ? 0 : 1) && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {step2Error}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2">
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
                disabled={isCreatingStep2}
                className="text-white"
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
                disabled={isCreatingStep2 || !selectedSimulationOptionId}
                className="text-white"
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
            initialFormData={editingUnit.formData as any}
            onSubmitSuccess={handleUnitDrawerSubmit}
          />
        )}

        {editingModule && editingModuleBoundUnit && (
          <DrawerFormModule
            stepperMode
            projectId={projectId}
            unitId={editingModuleBoundUnit.unitId}
            optionId={editingModuleBoundUnit.optionId}
            type={(editingModule.type as TModulesTypes) ?? "beam_column"}
            floors={editingUnitFloors}
            open={!!editingModuleTempId}
            onOpenChange={(o) => !o && setEditingModuleTempId(null)}
            initialModuleData={editingModuleInitialMerged as any}
            initialSelectedFloors={editingModuleInitialSelectedFloors}
            onSubmitSuccess={handleModuleDrawerSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Sub-view
// ---------------------------------------------------------------------------

function Step1UnitsView({
  state,
  toggleUnitSelected,
  setUnitNameInline,
  onEditUnit,
  t,
}: {
  state: TIfcStepperState;
  toggleUnitSelected: (tempId: string) => void;
  setUnitNameInline: (tempId: string, name: string) => void;
  onEditUnit: (tempId: string) => void;
  t: any;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {t.stepper?.units?.title ?? "Unidades encontradas"} (
          {state.units.length})
        </h3>
      </div>

      {state.units.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
          {t.stepper?.units?.noneFound ??
            "Nenhuma unidade retornada pelo processamento do IFC."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <span className="sr-only">Selecionar</span>
              </TableHead>
              <TableHead>{t.stepper?.units?.columnName ?? "Nome"}</TableHead>
              <TableHead>
                {t.stepper?.units?.columnFloors ?? "Pavimentos"}
              </TableHead>
              <TableHead>
                {t.stepper?.units?.columnStatus ?? "Status da validação"}
              </TableHead>
              <TableHead className="w-[120px] text-right">
                {t.stepper?.units?.columnAction ?? "Ação"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.units.map((u) => (
              <TableRow key={u.tempId}>
                <TableCell>
                  <Checkbox
                    checked={u.selected}
                    onCheckedChange={() => toggleUnitSelected(u.tempId)}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="text"
                    value={u.name}
                    onChange={(e) =>
                      setUnitNameInline(u.tempId, e.target.value)
                    }
                    className="w-full max-w-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5"
                  />
                </TableCell>
                <TableCell>
                  {u.formData.data.floors.length}{" "}
                  {u.formData.data.floors.length === 1
                    ? (t.stepper?.units?.floors ?? "andar")
                    : (t.stepper?.units?.floorsPlural ?? "andares")}
                </TableCell>
                <TableCell>
                  {u.isValid ? (
                    <Badge variant="success">
                      {t.stepper?.statusValid ?? "Válido"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {u.validationErrors.length}{" "}
                      {u.validationErrors.length === 1
                        ? (t.stepper?.units?.errors ?? "erro")
                        : (t.stepper?.units?.errorsPlural ?? "erros")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUnit(u.tempId)}
                    className="gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {t.stepper?.btnEdit ?? "Editar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Sub-view
// ---------------------------------------------------------------------------

function Step2ModulesView({
  state,
  applyUnitToAllModules,
  setModuleBoundUnit,
  onEditModule,
  toggleModuleSelected,
  toggleAllModulesSelected,
  moduleTypeLabels,
  t,
}: {
  state: TIfcStepperState;
  applyUnitToAllModules: (unitTempId: string) => void;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
  t: any;
}) {
  const allChecked =
    state.modules.length > 0 && state.modules.every((m) => m.selected);
  const someChecked = state.modules.some((m) => m.selected) && !allChecked;
  const selectedCount = state.modules.filter((m) => m.selected).length;
  const unselectedCount = state.modules.length - selectedCount;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">
          {t.stepper?.modules?.createdUnitsTitle ?? "Unidades criadas"}
        </h3>
        {state.unitsCreated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.stepper?.modules?.noUnitsCreated ??
              "Nenhuma unidade criada. Volte ao passo anterior."}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {state.unitsCreated.map((u) => (
              <div key={u.tempId} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {u.displayName}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyUnitToAllModules(u.tempId)}
                  title="Aplicar esta unidade a todos os módulos"
                >
                  {t.stepper?.modules?.applyToAll ?? "Aplicar a todos"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Alert
        variant="default"
        className="bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
      >
        <Info className="h-4 w-4 text-blue-700 dark:text-blue-300" />
        <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">
          {t.stepper?.selectAll
            ? `${t.stepper.selected} ${selectedCount} · ${t.stepper.unselected} ${unselectedCount}`
            : "Módulos selecionados"}
        </AlertTitle>
        <AlertDescription className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p>
            {t.stepper?.modules?.hint ??
              "A criação de módulos não é obrigatória. Somente os módulos marcados abaixo, válidos e com vínculo de unidade serão criados."}
          </p>
          {state.modules.length > 0 && (
            <p>
              {t.stepper?.selected ?? "Selecionados"}:{" "}
              <strong>{selectedCount}</strong> ·{" "}
              {t.stepper?.unselected ?? "Desmarcados"}:{" "}
              <strong>{unselectedCount}</strong> · {t.stepper?.total ?? "Total"}
              : {state.modules.length}
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">
            {t.stepper?.modules?.title ?? "Módulos encontrados"} (
            {state.modules.length})
          </h3>
        </div>

        {state.modules.length === 0 ? (
          <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
            {t.stepper?.modules?.noneFound ??
              "Nenhum módulo retornado pelo processamento do IFC."}
          </div>
        ) : (
          <TooltipProvider delayDuration={150}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[52px]">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(v) =>
                        toggleAllModulesSelected(Boolean(v))
                      }
                      aria-label="Selecionar todos os módulos"
                      className={
                        someChecked ? "data-[state=checked]:bg-white" : ""
                      }
                      {...(someChecked
                        ? { "data-state": "indeterminate" as any }
                        : {})}
                    />
                  </TableHead>
                  <TableHead>
                    {t.stepper?.modules?.columnType ?? "Tipo"}
                  </TableHead>
                  <TableHead>
                    {t.stepper?.modules?.columnSummary ?? "Resumo dos dados"}
                  </TableHead>
                  <TableHead>
                    {t.stepper?.modules?.columnUnit ?? "Unidade / Simulação"}
                  </TableHead>
                  <TableHead>
                    {t.stepper?.modules?.columnStatus ?? "Status da validação"}
                  </TableHead>
                  <TableHead className="w-[120px] text-right">
                    {t.stepper?.modules?.columnAction ?? "Ação"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.modules.map((m) => {
                  const hasErrors = !m.isValid && m.validationErrors.length > 0;
                  const hasWarnings =
                    m.isValid && m.completenessWarnings?.hasWarnings;
                  const warningCount =
                    m.completenessWarnings?.messages?.length ?? 0;
                  const errorCount = m.validationErrors.length;

                  let statusBadge: React.ReactNode;
                  if (hasErrors) {
                    statusBadge = (
                      <Badge variant="destructive">
                        {errorCount}{" "}
                        {errorCount === 1
                          ? (t.stepper?.units?.errors ?? "erro")
                          : (t.stepper?.units?.errorsPlural ?? "erros")}
                      </Badge>
                    );
                  } else if (hasWarnings) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-700"
                      >
                        {warningCount}{" "}
                        {warningCount === 1
                          ? (t.stepper?.statusWarnings ?? "aviso")
                          : `${t.stepper?.statusWarnings ?? "avisos"}`}
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="success">
                        {t.stepper?.statusValid ?? "Válido"}
                      </Badge>
                    );
                  }

                  return (
                    <TableRow key={m.tempId}>
                      <TableCell>
                        <Checkbox
                          checked={m.selected}
                          onCheckedChange={() => toggleModuleSelected(m.tempId)}
                          aria-label={`Selecionar módulo ${m.tempId}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {moduleTypeLabels[m.type] ?? String(m.type)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {m.summary}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        {state.unitsCreated.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {t.stepper?.modules?.noUnitsCreated ??
                              "Crie unidades no passo anterior"}
                          </span>
                        ) : (
                          <Select
                            value={m.boundUnitTempId ?? "__none__"}
                            onValueChange={(val) =>
                              setModuleBoundUnit(m.tempId, val)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  t.stepper?.modules?.unitSelectPlaceholder ??
                                  "Selecione uma unidade"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">
                                  {t.stepper?.modules?.noneBound ??
                                    "(Não vincular — será ignorado)"}
                                </span>
                              </SelectItem>
                              {state.unitsCreated.map((u) => (
                                <SelectItem key={u.tempId} value={u.tempId}>
                                  {u.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {!hasErrors && !hasWarnings ? (
                          statusBadge
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>{statusBadge}</span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="left"
                              align="start"
                              className="max-w-sm text-xs space-y-3 p-3"
                            >
                              {hasErrors && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-red-600 dark:text-red-300">
                                    {t.stepper?.validationErrors ??
                                      "Campos inválidos ou faltantes"}
                                    :
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {m.validationErrors
                                      .slice(0, 10)
                                      .map((e, idx) => (
                                        <li key={idx}>{e}</li>
                                      ))}
                                    {m.validationErrors.length > 10 && (
                                      <li className="text-muted-foreground">
                                        +{m.validationErrors.length - 10}{" "}
                                        {t.stepper?.others ?? "outros"}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {hasWarnings && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                                    {t.stepper?.semanticWarnings ??
                                      "Avisos semânticos (dados parciais)"}
                                    :
                                  </p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {(m.completenessWarnings.messages ?? [])
                                      .slice(0, 10)
                                      .map((msg, idx) => (
                                        <li key={idx}>{msg}</li>
                                      ))}
                                    {(m.completenessWarnings.messages ?? [])
                                      .length > 10 && (
                                      <li className="text-muted-foreground">
                                        +
                                        {(m.completenessWarnings.messages ?? [])
                                          .length - 10}{" "}
                                        {t.stepper?.others ?? "outros"}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditModule(m.tempId)}
                          disabled={!m.boundUnitTempId}
                          className="gap-1"
                          title={
                            !m.boundUnitTempId
                              ? (t.stepper?.modules?.editBtnDisabled ??
                                "Vincule uma unidade para editar")
                              : undefined
                          }
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          {t.stepper?.btnEdit ?? "Editar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
