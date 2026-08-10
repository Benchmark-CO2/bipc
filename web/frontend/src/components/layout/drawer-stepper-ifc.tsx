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
import { TModulesTypes } from "@/types/modules";
import { TOption } from "@/types/options";
import { TTowerFloorCategory, IUnit } from "@/types/units";
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
import {
  ModuleParamsProps,
  ModuleParamsPropsV2,
  TModuleDataV2,
} from "@/types/modules";

type TIfcProcessorStateUnit = IUnit;

interface IRawModuleDataWithMeta {
  floor_index?: number;
  floor_ids?: string[];
  unit_id?: string;
  [k: string]: unknown;
}

interface IOptionsResponse {
  options: TOption[];
}

interface IPatchUnitResponse {
  unit?: TIfcProcessorStateUnit;
  data?: { unit?: TIfcProcessorStateUnit };
}

interface IPostUnitResponse {
  unit?: TIfcProcessorStateUnit;
  data?: { unit?: TIfcProcessorStateUnit };
}

interface IPostOptionResponse {
  option?: TOption;
  tower_option?: TOption;
  data?: {
    option?: TOption;
    tower_option?: TOption;
  };
}

interface IGetUnitByUUIDCachedResponse {
  data?: { unit?: { floors?: TTowerFloorCategory[] } };
}

type TEditingModuleMerged = TModuleGroupedForm & IRawModuleDataWithMeta;

interface IModuleBatchBinding {
  unit_id?: string;
  floor_ids?: string[];
}

interface Step1UnitsViewProps {
  state: TIfcStepperState;
  toggleUnitSelected: (tempId: string) => void;
  setUnitNameInline: (tempId: string, name: string) => void;
  onEditUnit: (tempId: string) => void;
  t: Translations;
}

interface Step2ModulesViewProps {
  state: TIfcStepperState;
  applyUnitToAllModules: (unitTempId: string) => void;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
  t: Translations;
}

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
            floors = convertFloorFormInputToTowerFloors(
              rawFloors as unknown as UnitFormInput["data"]["floors"],
            );
          }
        }

        // (C) Fallback por state.units usando unitName como referência
        if (floors.length === 0 && unitCreated.unitName) {
          const unitState = state.units.find(
            (u) => u.name && u.name === unitCreated.unitName,
          );
          const rawFloors = unitState?.formData?.data?.floors ?? [];
          if (rawFloors.length > 0) {
            floors = convertFloorFormInputToTowerFloors(
              rawFloors as unknown as UnitFormInput["data"]["floors"],
            );
          }
        }

        // (D) Fallback por queryClient cache (getUnitByUUID já realizada)
        if (floors.length === 0 && unitCreated.unitId && !isSimulationMode) {
          try {
            const cached = queryClient.getQueryData([
              "unit",
              projectId,
              unitCreated.unitId,
            ]) as IGetUnitByUUIDCachedResponse | undefined;
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
          const tower = convertFloorFormInputToTowerFloors(
            rawFloors as unknown as UnitFormInput["data"]["floors"],
          );
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
          return convertFloorFormInputToTowerFloors(
            raw as unknown as UnitFormInput["data"]["floors"],
          );
        }
      }
      try {
        const cached = queryClient.getQueryData([
          "unit",
          projectId,
          editingModuleBoundUnit.unitId,
        ]) as IGetUnitByUUIDCachedResponse | undefined;
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
    const rawIndex = (
      editingModule.raw?.data as unknown as IRawModuleDataWithMeta
    )?.floor_index;
    return mapFloorIndexToFloorIds(rawIndex, editingUnitFloors);
  }, [editingModule, editingUnitFloors]);

  // Dados merged do initialModuleData passados para o DrawerFormModule:
  // inclui raw.data original E também `floor_ids` já mapeados (fallback caso
  // initialSelectedFloors seja ignorado).
  const editingModuleInitialMerged: TEditingModuleMerged = useMemo(() => {
    if (!editingModule?.raw?.data) return {} as TEditingModuleMerged;
    return {
      ...(editingModule.raw.data as unknown as IRawModuleDataWithMeta),
      floor_ids: editingModuleInitialSelectedFloors,
    } as TEditingModuleMerged;
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
        <DialogHeader className="px-3 pt-1 pb-2 border-b gap-1.5">
          {/* ROW 1: Título à esquerda / Badge arquivo à direita */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <DialogTitle className="text-lg font-bold text-primary leading-tight">
                {isSimulationMode
                  ? translations.stepper.simulation.title
                  : translations.stepper.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {isSimulationMode
                  ? translations.stepper.simulation.description
                  : translations.stepper.subtitle}
              </p>
            </div>
            {fileName ? (
              <Badge
                variant="secondary"
                className="text-xs px-2.5 py-1 gap-1.5 max-w-[55%] overflow-hidden text-ellipsis whitespace-nowrap shrink-0 shadow-sm"
                title={fileName}
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {fileName}
                </span>
              </Badge>
            ) : null}
          </div>

          {/* ROW 2: Stepper (sem pt-4 exagerado) */}
          <div className="pt-1.5">
            <Stepper activeStep={activeStep} steps={steps} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          {isSimulationMode && (
            <div className="mb-2 border rounded-lg px-3 py-2 bg-gray-50/40 dark:bg-gray-900/40 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Sempre exibimos o label + conteúdo. Estado (A) ou (B) muda só o que vem à direita do label */}
              <label className="text-xs font-semibold text-foreground whitespace-nowrap shrink-0">
                {translations.stepper.simulation.selectLabel}
              </label>

              {/* ESTADO (B) — SIMULAÇÃO JÁ SELECIONADA: Unifica Select + Badge "definida" em um único bloco com o NOME da simulação + botão Trocar */}
              {selectedSimulationOptionId ? (
                <div className="flex flex-1 flex-wrap sm:justify-end items-center gap-2 min-w-0">
                  <Badge
                    variant="success"
                    className="h-7 text-[12px] px-2.5 py-0 gap-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                    title={
                      availableOptions.find(
                        (o) => o.id === selectedSimulationOptionId,
                      )?.name ?? selectedSimulationOptionId
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {availableOptions.find(
                        (o) => o.id === selectedSimulationOptionId,
                      )?.name ?? selectedSimulationOptionId}
                    </span>
                  </Badge>
                  {/* Select "Trocar" inline (label fixa = "Trocar" dentro do trigger, não o valor) */}
                  <Select
                    value={selectedSimulationOptionId}
                    onValueChange={(v) => setSelectedSimulationOptionId(v)}
                  >
                    <SelectTrigger
                      className="h-7 min-w-[100px] w-auto text-[11px] px-2.5 py-0"
                      aria-label={
                        translations.stepper.simulation.changeAriaLabel
                      }
                    >
                      <span className="flex items-center justify-between w-full">
                        <span>
                          {translations.stepper.simulation.changeLabel}
                        </span>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="text-sm">{o.name}</span>
                          {o.active ? (
                            <span className="ml-2 text-[11px] text-primary font-medium">
                              (ativa)
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {preselectedUnitId && initialRoleId ? (
                    <DialogCreateSimulation
                      projectId={projectId}
                      unitId={preselectedUnitId}
                      roleId={initialRoleId}
                      triggerComponent={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 py-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            {translations.stepper.simulation.createNew}
                          </span>
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
              ) : (
                /* ESTADO (A) — NÃO SELECIONADO: Select visível (obrigatório) + Alerta amarelo inline junto, não separado */
                <div className="flex flex-1 flex-wrap sm:justify-end items-center gap-2 min-w-0">
                  <Select
                    value=""
                    onValueChange={(v) => setSelectedSimulationOptionId(v)}
                  >
                    <SelectTrigger className="min-w-[240px] h-9">
                      <SelectValue
                        placeholder={
                          availableOptions.length === 0
                            ? translations.stepper.simulation.noOptions
                            : translations.stepper.simulation.selectPlaceholder
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.length === 0 && (
                        <div className="text-xs px-2 py-3 text-muted-foreground">
                          {translations.stepper.simulation.noOptionsHint}
                        </div>
                      )}
                      {availableOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="text-sm">{o.name}</span>
                          {o.active ? (
                            <span className="ml-2 text-[11px] text-primary font-medium">
                              (ativa)
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {preselectedUnitId && initialRoleId ? (
                    <DialogCreateSimulation
                      projectId={projectId}
                      unitId={preselectedUnitId}
                      roleId={initialRoleId}
                      triggerComponent={
                        <Button variant="outline" size="sm" className="h-9">
                          <Plus className="h-3.5 w-3.5" />{" "}
                          <span className="text-xs">
                            {translations.stepper.simulation.createNew}
                          </span>
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
                  {/* Alerta obrigatório AGORA AQUI no final (não mais separado) — inline com o restante */}
                  <div className="flex items-start gap-1.5 px-2 py-1 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-snug text-yellow-800 dark:text-yellow-200 whitespace-nowrap">
                      {translations.stepper.simulation.requiredHint}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSimulationMode && activeStep === 0 && (
            <Step1UnitsView
              state={state}
              toggleUnitSelected={toggleUnitSelected}
              setUnitNameInline={setUnitNameInline}
              onEditUnit={(tempId) => setEditingUnitTempId(tempId)}
              t={translations}
            />
          )}
          {activeStep === (isSimulationMode ? 0 : 1) &&
          selectedModulesWithBlocking.length > 0 ? (
            <Alert
              variant="destructive"
              className="mb-2 mt-1 py-2 px-3 flex-row items-start gap-2 border-red-300 dark:border-red-700 bg-red-50/70 dark:bg-red-950/25"
            >
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <AlertTitle className="text-sm text-red-800 dark:text-red-200 font-semibold leading-snug">
                  {selectedModulesWithBlocking.length} módulo
                  {selectedModulesWithBlocking.length === 1 ? "" : "s"}{" "}
                  selecionado
                  {selectedModulesWithBlocking.length === 1 ? "" : "s"} com
                  problema — concluir bloqueado
                </AlertTitle>
                <AlertDescription className="text-[11.5px] text-red-700 dark:text-red-300 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span>
                    Corrija os campos obrigatórios / recomendados do módulo,
                    vincule a uma unidade ou <strong>desmarque</strong> os
                    bloqueados abaixo para prosseguir.
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {countBlockingErrors > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 h-5 text-[10.5px] px-1.5 py-0"
                      >
                        {countBlockingErrors} com erros
                      </Badge>
                    ) : null}
                    {countBlockingWarnings > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 h-5 text-[10.5px] px-1.5 py-0"
                      >
                        {countBlockingWarnings} com avisos
                      </Badge>
                    ) : null}
                    {countBlockingNoBinding > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 h-5 text-[10.5px] px-1.5 py-0"
                      >
                        {countBlockingNoBinding} sem unidade
                      </Badge>
                    ) : null}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          ) : null}
          {activeStep === (isSimulationMode ? 0 : 1) && (
            <Step2ModulesView
              state={state}
              applyUnitToAllModules={applyUnitToAllModules}
              setModuleBoundUnit={setModuleBoundUnit}
              onEditModule={(tempId) => setEditingModuleTempId(tempId)}
              toggleModuleSelected={toggleModuleSelected}
              toggleAllModulesSelected={toggleAllModulesSelected}
              moduleTypeLabels={moduleTypeLabels}
              t={translations}
            />
          )}

          {step1Error && !isSimulationMode && activeStep === 0 && (
            <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-200">
                  {step1Error}
                </p>
              </div>
            </div>
          )}
          {step2Error && activeStep === (isSimulationMode ? 0 : 1) && (
            <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-700 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-200">
                  {step2Error}
                </p>
              </div>
            </div>
          )}
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

        {editingModule && editingModuleBoundUnit && (
          <DrawerFormModule
            stepperMode
            projectId={projectId}
            unitId={editingModuleBoundUnit.unitId}
            optionId={editingModuleBoundUnit.optionId}
            type={(editingModule.type as TModulesTypes) ?? "beam_column"}
            floors={editingUnitFloors}
            source="ifc"
            open={!!editingModuleTempId}
            onOpenChange={(o) => !o && setEditingModuleTempId(null)}
            initialModuleData={
              editingModuleInitialMerged as unknown as TEditingModuleMerged
            }
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
}: Step1UnitsViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {t.stepper.units.title} ({state.units.length})
        </h3>
      </div>

      {state.units.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
          {t.stepper.units.noneFound}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <span className="sr-only">Selecionar</span>
              </TableHead>
              <TableHead>{t.stepper.units.columnName}</TableHead>
              <TableHead>{t.stepper.units.columnFloors}</TableHead>
              <TableHead>{t.stepper.units.columnStatus}</TableHead>
              <TableHead className="w-[120px] text-right">
                {t.stepper.units.columnAction}
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
                    ? t.stepper.units.floors
                    : t.stepper.units.floorsPlural}
                </TableCell>
                <TableCell>
                  {u.isValid ? (
                    <Badge variant="success">{t.stepper.statusValid}</Badge>
                  ) : (
                    <Badge variant="destructive">
                      {u.validationErrors.length}{" "}
                      {u.validationErrors.length === 1
                        ? t.stepper.units.errors
                        : t.stepper.units.errorsPlural}
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
                    {t.stepper.btnEdit}
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
}: Step2ModulesViewProps) {
  const allChecked =
    state.modules.length > 0 && state.modules.every((m) => m.selected);
  const someChecked = state.modules.some((m) => m.selected) && !allChecked;
  const selectedCount = state.modules.filter((m) => m.selected).length;
  const unselectedCount = state.modules.length - selectedCount;
  const totalCount = state.modules.length;

  return (
    <div className="space-y-2">
      {/* LINHA 1: Unidades criadas + "Aplicar a todos" (linha única, counts removidos daqui) */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
          {t.stepper.modules.createdUnitsTitle}
        </h3>
        {state.unitsCreated.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {t.stepper.modules.noUnitsCreated}
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {state.unitsCreated.map((u) => (
              <div key={u.tempId} className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs px-2 py-0.5 h-6">
                  {u.displayName}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => applyUnitToAllModules(u.tempId)}
                  title={t.stepper.modules.applyToAll}
                >
                  {t.stepper.modules.applyToAll}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LINHA 2: Alert informativo (módulos não obrigatórios) — compacto inline */}
      <Alert
        variant="default"
        className="py-1.5 px-2.5 flex-row items-center gap-2 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
      >
        <Info className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300 shrink-0 -mt-0.5" />
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[11.5px] leading-snug text-blue-800 dark:text-blue-200">
            {t.stepper.modules.hint}
          </p>
        </div>
      </Alert>

      {/* LINHA 3: Título "Módulos encontrados" + BADGES COUNTS (Sel/Desm/Total) AQUI (unificado) */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-sm font-semibold text-foreground">
          {t.stepper.modules.title}
          <span className="text-muted-foreground font-normal ml-1.5">
            ({state.modules.length})
          </span>
        </h3>
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="secondary"
              className="h-6 text-[11px] px-2 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
            >
              {t.stepper.selected} <strong>{selectedCount}</strong>
            </Badge>
            {unselectedCount > 0 && (
              <Badge
                variant="secondary"
                className="h-6 text-[11px] px-2 py-0 bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/60 dark:text-gray-300 dark:border-gray-700"
              >
                {t.stepper.unselected} <strong>{unselectedCount}</strong>
              </Badge>
            )}
            <Badge variant="outline" className="h-6 text-[11px] px-2 py-0">
              {t.stepper.total} <strong>{totalCount}</strong>
            </Badge>
          </div>
        )}
      </div>

      {/* Tabela de módulos (contém o checkbox de "selecionar todos" no header da tabela) */}
      <div>
        {state.modules.length === 0 ? (
          <div className="text-sm text-muted-foreground p-6 border rounded-lg text-center">
            {t.stepper.modules.noneFound}
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
                        ? ({ "data-state": "indeterminate" } as Record<
                            string,
                            string
                          >)
                        : {})}
                    />
                  </TableHead>
                  <TableHead>{t.stepper.modules.columnType}</TableHead>
                  <TableHead>{t.stepper.modules.columnSummary}</TableHead>
                  <TableHead>{t.stepper.modules.columnUnit}</TableHead>
                  <TableHead>{t.stepper.modules.columnStatus}</TableHead>
                  <TableHead className="w-[120px] text-right">
                    {t.stepper.modules.columnAction}
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
                          ? t.stepper.units.errors
                          : t.stepper.units.errorsPlural}
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
                          ? t.stepper.statusWarnings
                          : `${t.stepper.statusWarnings}`}
                      </Badge>
                    );
                  } else {
                    statusBadge = (
                      <Badge variant="success">{t.stepper.statusValid}</Badge>
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
                            {t.stepper.modules.noUnitsCreated}
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
                                  t.stepper.modules.unitSelectPlaceholder
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                <span className="text-muted-foreground">
                                  {t.stepper.modules.noneBound}
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
                                    {t.stepper.validationErrors}:
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
                                        {t.stepper.others}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              {hasWarnings && (
                                <div className="space-y-1">
                                  <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                                    {t.stepper.semanticWarnings}:
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
                                        {t.stepper.others}
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
                              ? t.stepper.modules.editBtnDisabled
                              : undefined
                          }
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          {t.stepper.btnEdit}
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
