import { postModulesBatch } from "@/actions/modules/postModulesBatch";
import { postOption } from "@/actions/options/postOption";
import { patchOption } from "@/actions/options/patchOption";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { postUnit } from "@/actions/units/postUnit";
import { patchUnit } from "@/actions/units/patchUnit";
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
import {
  TIfcProcessorAggregatedResult,
  TIfcStepperCreatedUnit,
  TIfcStepperModuleItem,
  TIfcStepperState,
  TIfcStepperUnitItem,
} from "@/types/ifc";
import { parseApiError } from "@/utils/parseApiError";
import {
  aggregateIdenticalFloors,
  buildUniqueSimulationName,
  mapIfcResultToStepperState,
  MODULE_TYPE_LABEL_FALLBACK,
  prepareModuleForBatch,
  prepareUnitForCreate,
  rerunModuleValidation,
  rerunUnitValidation,
  resolveSimulationRoleId,
} from "@/utils/ifcStepper";
import { UnitFormInput, UnitFormSchema } from "@/validators/unitForm.validator";
import {
  ModuleFormInput,
  ModuleFormSchema,
} from "@/validators/moduleFormByType.validator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Edit2, Info, Loader2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DrawerFormModule from "./drawer-form-module";
import DrawerFormUnit from "./drawer-form-unit";
import { ModuleParamsProps } from "@/types/modules";

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
  onComplete?: () => void;
}

export default function DrawerStepperIFC({
  open,
  onOpenChange,
  projectId,
  initialResult,
  onComplete,
}: DrawerStepperIFCProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
    enabled: open,
  });
  const project: IProject | undefined = projectData?.data.project;

  const initialState = useMemo<TIfcStepperState>(() => {
    return mapIfcResultToStepperState(initialResult, t as any);
  }, [initialResult]);

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
    setState(initialState);
    setStep1Error("");
    setStep2Error("");
    setIsCreatingStep1(false);
    setIsCreatingStep2(false);
    setEditingUnitTempId(null);
    setEditingModuleTempId(null);
  }, [initialState]);

  const activeStep = state.currentStep === "units" ? 0 : 1;
  const steps = [
    {
      id: "units",
      label: "Unidades",
      description: "Validar e criar unidades",
    },
    {
      id: "modules",
      label: "Módulos",
      description: "Vincular e criar módulos",
    },
  ];

  const editingUnit = state.units.find((u) => u.tempId === editingUnitTempId);
  const editingModule = state.modules.find(
    (m) => m.tempId === editingModuleTempId,
  );
  const editingModuleBoundUnit = editingModule?.boundUnitTempId
    ? state.unitsCreated.find((u) => u.tempId === editingModule.boundUnitTempId)
    : undefined;

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
    const simRoleId = resolveSimulationRoleId({
      roles: (projectObj as any).roles ?? [],
    });
    if (!simRoleId) {
      toast.error(
        "Nenhum papel de simulação encontrado no projeto. Contate o administrador.",
      );
      return;
    }

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
    params: ModuleParamsProps;
    selectedFloors: string[];
    schemaData: ModuleFormSchema;
    formInput: ModuleFormInput;
  }) => {
    if (!editingModuleTempId) return;
    setState((prev) => {
      const next = { ...prev };
      next.modules = next.modules.map((m) => {
        if (m.tempId !== editingModuleTempId) return m;
        const rawNext = {
          ...m.raw,
          type: payload.params.type,
          data: { ...(m.raw.data ?? {}), ...(payload.params.data ?? {}) },
        };
        const rebuilt = { ...m, raw: rawNext, type: payload.params.type };
        return rerunModuleValidation(rebuilt);
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
        for (const m of groupModules) {
          const isFoundation = FOUNDATION_MODULE_TYPES.includes(
            m.type as TModulesTypes,
          );
          const binding = isFoundation
            ? { unit_id: unit.unitId }
            : { floor_ids: (m as any).raw?.data?.floor_indexes ?? [] };
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
            Importar dados do IFC
          </DialogTitle>
          <DialogDescription>
            Valide unidades e módulos extraídos do arquivo IFC antes de criar.
          </DialogDescription>
          <div className="pt-4">
            <Stepper activeStep={activeStep} steps={steps} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {activeStep === 0 && (
            <Step1UnitsView
              state={state}
              toggleUnitSelected={toggleUnitSelected}
              setUnitNameInline={setUnitNameInline}
              onEditUnit={(tempId) => setEditingUnitTempId(tempId)}
            />
          )}
          {activeStep === 1 && (
            <Step2ModulesView
              state={state}
              applyUnitToAllModules={applyUnitToAllModules}
              setModuleBoundUnit={setModuleBoundUnit}
              onEditModule={(tempId) => setEditingModuleTempId(tempId)}
              toggleModuleSelected={toggleModuleSelected}
              toggleAllModulesSelected={toggleAllModulesSelected}
              moduleTypeLabels={moduleTypeLabels}
            />
          )}

          {step1Error && activeStep === 0 && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {step1Error}
                </p>
              </div>
            </div>
          )}
          {step2Error && activeStep === 1 && (
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
          {activeStep === 0 && (
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
          {activeStep === 1 && (
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
            open={!!editingModuleTempId}
            onOpenChange={(o) => !o && setEditingModuleTempId(null)}
            initialModuleData={editingModule.raw.data as any}
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
}: {
  state: TIfcStepperState;
  toggleUnitSelected: (tempId: string) => void;
  setUnitNameInline: (tempId: string, name: string) => void;
  onEditUnit: (tempId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Unidades encontradas ({state.units.length})
        </h3>
      </div>

      {state.units.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
          Nenhuma unidade retornada pelo processamento do IFC.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <span className="sr-only">Selecionar</span>
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Pavimentos</TableHead>
              <TableHead>Status da validação</TableHead>
              <TableHead className="w-[120px] text-right">Ação</TableHead>
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
                  {u.formData.data.floors.length} andar
                  {u.formData.data.floors.length === 1 ? "" : "es"}
                </TableCell>
                <TableCell>
                  {u.isValid ? (
                    <Badge variant="success">Válido</Badge>
                  ) : (
                    <Badge variant="destructive">
                      {u.validationErrors.length} erro
                      {u.validationErrors.length === 1 ? "" : "s"}
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
                    Editar
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
}: {
  state: TIfcStepperState;
  applyUnitToAllModules: (unitTempId: string) => void;
  setModuleBoundUnit: (moduleTempId: string, unitTempId: string) => void;
  onEditModule: (tempId: string) => void;
  toggleModuleSelected: (tempId: string) => void;
  toggleAllModulesSelected: (checked: boolean) => void;
  moduleTypeLabels: Record<string, string>;
}) {
  const allChecked =
    state.modules.length > 0 && state.modules.every((m) => m.selected);
  const someChecked = state.modules.some((m) => m.selected) && !allChecked;
  const selectedCount = state.modules.filter((m) => m.selected).length;
  const unselectedCount = state.modules.length - selectedCount;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">Unidades criadas</h3>
        {state.unitsCreated.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma unidade criada. Volte ao passo anterior.
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
                  Aplicar a todos
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
          Módulos selecionados
        </AlertTitle>
        <AlertDescription className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p>
            A criação de módulos <strong>não é obrigatória</strong>. Somente os
            módulos marcados abaixo, válidos e com vínculo de unidade serão
            criados.
          </p>
          {state.modules.length > 0 && (
            <p>
              Selecionados: <strong>{selectedCount}</strong> · Desmarcados:{" "}
              <strong>{unselectedCount}</strong> · Total: {state.modules.length}
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">
            Módulos encontrados ({state.modules.length})
          </h3>
        </div>

        {state.modules.length === 0 ? (
          <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
            Nenhum módulo retornado pelo processamento do IFC.
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Resumo dos dados</TableHead>
                  <TableHead>Unidade / Simulação</TableHead>
                  <TableHead>Status da validação</TableHead>
                  <TableHead className="w-[120px] text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.modules.map((m) => (
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
                          Crie unidades no passo anterior
                        </span>
                      ) : (
                        <Select
                          value={m.boundUnitTempId ?? "__none__"}
                          onValueChange={(val) =>
                            setModuleBoundUnit(m.tempId, val)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma unidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">
                                (Não vincular — será ignorado)
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
                      {m.isValid ? (
                        <Badge variant="success">Válido</Badge>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0}>
                              <Badge variant="destructive">
                                {m.validationErrors.length} erro
                                {m.validationErrors.length === 1 ? "" : "s"}
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            align="start"
                            className="max-w-sm text-xs"
                          >
                            <p className="font-semibold mb-1">
                              Problemas encontrados:
                            </p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {m.validationErrors.slice(0, 10).map((e, idx) => (
                                <li key={idx}>{e}</li>
                              ))}
                              {m.validationErrors.length > 10 && (
                                <li className="text-muted-foreground">
                                  +{m.validationErrors.length - 10} outros
                                </li>
                              )}
                            </ul>
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
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
