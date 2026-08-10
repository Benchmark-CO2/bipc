import { getModule } from "@/actions/modules/getModule";
import { patchModule } from "@/actions/modules/patchModule";
import { postModule } from "@/actions/modules/postModule";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  ModuleParamsProps,
  TModulesTypes,
  TModuleDataV2,
  ModuleParamsPropsV2,
} from "@/types/modules";
import { TTowerFloorCategory } from "@/types/units";
import {
  ModuleFormState,
  moduleFormSchema,
} from "@/validators/moduleFormByType.validator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { mapFloorIndexToFloorIds } from "@/utils/unitConversions";
import { Alert, AlertDescription } from "../../ui/alert";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import BuildingVisualizer from "../building-visualizer";
import { getDefaultValuesByType } from "./module-default-values";
import ModuleFormBeamColumn from "./module-form-beam-column";
import ModuleFormConcreteWall from "./module-form-concrete-wall";
import ModuleFormStructuralMasonry from "./module-form-structural-masonry";
import ModuleFormRaftFoundation from "./module-form-raft-foundation";
import ModuleFormPilesFoundation from "./module-form-piles-foundation";
import ModuleFormRaftPilesFoundation from "./module-form-raft-piles-foundation";
import {
  flatV2ToGroupedForm,
  groupedFormToFlatV2,
  cleanZeroItemsBeforeSubmit,
  TModuleGroupedForm,
  getCompletenessWarnings,
  CompletenessWarningsI18n,
} from "./aggregate-helpers";

export type ModuleFormSource = "default" | "ifc" | "tqs";

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId?: string | null;
  optionId?: string | null;
  moduleId?: string;
  type: TModulesTypes;
  floors?: TTowerFloorCategory[];
  source?: ModuleFormSource;

  stepperMode?: boolean;
  strictValidation?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialModuleData?: Partial<ModuleFormState> | Partial<TModuleDataV2>;
  initialSelectedFloors?: string[];
  onSubmitSuccess?: (payload: {
    moduleId?: string;
    params: ModuleParamsProps | ModuleParamsPropsV2;
    selectedFloors: string[];
    formInput: ModuleFormState;
    flatData: TModuleDataV2 & {
      type: TModulesTypes;
      floor_ids?: string[];
      unit_id?: string;
    };
  }) => void;
}

const DrawerFormModule = ({
  triggerComponent,
  projectId,
  unitId: unitIdProp,
  optionId: optionIdProp,
  moduleId,
  type,
  floors = [],
  source = "default",
  stepperMode = false,
  strictValidation: strictValidationProp,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialModuleData,
  initialSelectedFloors,
  onSubmitSuccess,
}: DrawerFormModuleProps) => {
  // Se não tivermos unitId / optionId (modo stepper, unidade não criada ainda),
  // fallback para string vazia para não quebrar queries / mutations que esperam
  // string. Muitos hooks são desabilitados via enabled: !!unitId anyway.
  const unitId = unitIdProp ?? "";
  const optionId = optionIdProp ?? "";
  const strictValidation = strictValidationProp ?? !stepperMode;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof next === "function" ? next(isOpen) : next;
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);

  const initialDataIsFlatV2 = useMemo(() => {
    if (!initialModuleData) return false;
    return "concrete" in initialModuleData || "masonry" in initialModuleData;
  }, [initialModuleData]);

  const mergedDefaults = useMemo<ModuleFormState>(() => {
    let base: any;
    if (initialDataIsFlatV2 && initialModuleData) {
      base = flatV2ToGroupedForm(
        (initialModuleData as any).type || type,
        initialModuleData as any,
      );
    } else {
      base = getDefaultValuesByType(type);
    }

    if (initialModuleData && !initialDataIsFlatV2) {
      const merged: any = { ...base };
      for (const key of Object.keys(initialModuleData)) {
        const val = (initialModuleData as any)[key];
        if (val !== null && val !== undefined) {
          merged[key] = val;
        }
      }
      if (!merged.type) merged.type = type;
      return merged as ModuleFormState;
    }

    if (!base.type) base.type = type;
    return base as ModuleFormState;
  }, [initialModuleData, type, initialDataIsFlatV2]);

  const { t } = useTranslation();

  const queryClient = useQueryClient();

  const customModuleResolver = async (values: ModuleFormState) => {
    const flat = groupedFormToFlatV2(
      values.type || type,
      values,
      selectedFloors,
      unitId,
    );
    const cleaned = cleanZeroItemsBeforeSubmit(flat as any);
    const result = moduleFormSchema.safeParse(cleaned);

    const resolvedType: TModulesTypes = (values.type as TModulesTypes) || type;
    const resolverIsUsingPaviments =
      resolvedType === "beam_column" ||
      resolvedType === "concrete_wall" ||
      resolvedType === "structural_masonry";
    const floorsMissing =
      resolverIsUsingPaviments && selectedFloors.length === 0;

    const fieldErrors: Record<string, any> = {};
    if (result.error) {
      const issues = result.error.issues ?? [];
      for (const issue of issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = {
            type: "custom",
            message: issue.message,
          };
        }
      }
    }

    if (floorsMissing) {
      const msg =
        (t?.modules?.form?.selectAtLeastOneFloor as string) ||
        "Selecione pelo menos um pavimento.";
      fieldErrors["selectedFloors"] = {
        type: "custom",
        message: msg,
      };
    }

    const hasAnyErrors = Object.keys(fieldErrors).length > 0;

    if (!hasAnyErrors) {
      return { values: values as any, errors: {} };
    }
    if (!strictValidation) {
      return { values: values as any, errors: {} };
    }
    return { values: {} as any, errors: fieldErrors };
  };

  const form = useForm<ModuleFormState>({
    resolver: customModuleResolver as any,
    defaultValues: mergedDefaults,
  });

  const structureTypeWatch = form.watch("type");
  const allFormValues = form.watch();

  const partialWarnings = useMemo(() => {
    const flat = groupedFormToFlatV2(
      (allFormValues as any)?.type || type,
      allFormValues as any,
      selectedFloors,
      unitId,
    );
    const cleaned = cleanZeroItemsBeforeSubmit(flat as any);
    const i18n = t.modules.form.completeness as any as CompletenessWarningsI18n;
    const base = getCompletenessWarnings(
      cleaned,
      ((allFormValues as any)?.type || type) as TModulesTypes,
      i18n,
    );
    const resolvedType: TModulesTypes =
      ((allFormValues as any)?.type as TModulesTypes) || type;
    const usingPav =
      resolvedType === "beam_column" ||
      resolvedType === "concrete_wall" ||
      resolvedType === "structural_masonry";
    if (usingPav && selectedFloors.length === 0) {
      const msg =
        (t?.modules?.form?.selectAtLeastOneFloor as string) ||
        "Selecione pelo menos um pavimento.";
      return {
        hasWarnings: true,
        messages: [msg, ...base.messages],
      };
    }
    return base;
  }, [allFormValues, type, selectedFloors, unitId, t]);

  const isUsingPaviments =
    structureTypeWatch === "beam_column" ||
    structureTypeWatch === "concrete_wall" ||
    structureTypeWatch === "structural_masonry";

  const { mutate: mutateModule, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: ModuleParamsPropsV2) =>
      patchModule(data, projectId, unitId, optionId, moduleId!),
    onError: (error) => {
      if (!stepperMode) {
        toast.error(t.modules.form.updateError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: (_data) => {
      if (!stepperMode) {
        toast.success(t.modules.form.updateSuccess, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["unit", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["module", projectId, unitId, moduleId!],
        });
        queryClient.invalidateQueries({
          queryKey: ["module", projectId, unitId, optionId, moduleId!],
        });
        form.reset(getDefaultValuesByType(type) as any);
        setSelectedFloors([]);
        setIsOpen(false);
      }
    },
  });

  const { isPending: isCreationPending, mutate: mutateCreation } = useMutation({
    mutationFn: (data: ModuleParamsPropsV2) =>
      postModule(data, projectId, unitId, optionId),
    onError: (error) => {
      if (!stepperMode) {
        toast.error(t.modules.form.createError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: (data, variables) => {
      if (!stepperMode) {
        toast.success(t.modules.form.createSuccess, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["unit", projectId, unitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
        form.reset(getDefaultValuesByType(type) as any);
        setSelectedFloors([]);
        setIsOpen(false);
      } else {
        const createdId = (data as any)?.data?.module?.id;
        if (onSubmitSuccess) {
          const currentType = (form.getValues() as any).type || type;
          const flat = groupedFormToFlatV2(
            currentType,
            form.getValues() as any,
            selectedFloors,
            unitId,
          );
          onSubmitSuccess({
            moduleId: createdId,
            params: variables,
            selectedFloors,
            formInput: form.getValues(),
            flatData: flat,
          });
        }
      }
    },
  });

  const { data: moduleData, isLoading: isLoadingModule } = useQuery({
    queryKey: ["module", projectId, unitId, optionId, moduleId],
    queryFn: async () => {
      if (moduleId) {
        const res = await getModule(projectId, unitId, optionId, moduleId);
        return res.data.module;
      }
      return null;
    },
    enabled: !!moduleId && isOpen && !stepperMode,
  });

  // ---------------------------------------------------------------------------
  // 2 useEffects separados para evitar sobrescrever dados do usuário:
  //  (A) Reset do form + initialização do selectedFloors: RODA APENAS QUANDO
  //      `isOpen` vai de false → true (ou troca editing target, track com chave).
  //  (B) Ajuste do selectedFloors se floors chegaram depois (async fetch da unidade)
  //      — só altera selectedFloors se não houver escolha do usuário ainda.
  // ---------------------------------------------------------------------------

  // Chave composta para detectar mudança no "alvo da edição" no stepper mode.
  // Se trocar initialModuleData.floor_index ou tempId da unidade, considera-se
  // um novo target e portanto reiniciar (A).
  const stepperEditingTargetKey = useMemo(() => {
    const initialFloorIdx = (initialModuleData as any)?.floor_index;
    const initialFloorIds = (initialModuleData as any)?.floor_ids;
    const initialSelected = initialSelectedFloors;
    const floorsIdsKey = Array.isArray(initialFloorIds)
      ? initialFloorIds.join(",")
      : "";
    const selectedKey = Array.isArray(initialSelected)
      ? initialSelected.join(",")
      : "";
    return `${initialFloorIdx ?? "null"}|${floorsIdsKey}|${selectedKey}|${
      (initialModuleData as any)?.id ?? ""
    }|${(initialModuleData as any)?.tempId ?? ""}`;
  }, [initialModuleData, initialSelectedFloors]);

  // Flag para saber se o usuário já mudou o selectedFloors manualmente.
  // Se sim, não sobrescrevemos no (B) quando os floors chegarem async.
  const [userTouchedSelectedFloors, setUserTouchedSelectedFloors] =
    useState(false);

  // Refs que mantêm os valores das props do "momento em que o drawer abriu".
  // Sem isso: se as props oscilarem de referência mesmo com dados iguais,
  // ou mergedDefaults recalcula por qualquer dep, o useEffect (A) pode
  // rodar de novo → form.reset sobrescreve dados do usuário → causa
  // re-render do pai → novas referências → LOOP.
  const prevIsOpenRef = useRef(false);
  const openMergedDefaultsRef = useRef<ModuleFormState | null>(null);
  const openInitialSelectedFloorsRef = useRef<string[] | null>(null);
  const openInitialModuleDataRef = useRef<unknown>(null);
  const openInitialDataIsFlatV2Ref = useRef<boolean | null>(null);
  const openFloorsRef = useRef<TTowerFloorCategory[] | null>(null);

  // Intercepta mudança manual do usuário em selectedFloors para marcar a flag.
  const prevSelectedFloorsRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = prevSelectedFloorsRef.current;
    const curr = selectedFloors;
    const same =
      prev.length === curr.length &&
      prev.every((v) => curr.includes(v)) &&
      curr.every((v) => prev.includes(v));
    if (!same) {
      setUserTouchedSelectedFloors(true);
    }
    prevSelectedFloorsRef.current = curr;
  }, [selectedFloors]);

  // (A) Reset do form + inicialização do selectedFloors
  //
  // Roda APENAS NA BORDA DE SUBIDA DE isOpen (false → true) OU
  // QUANDO o stepperEditingTargetKey mudar (indicando que agora estamos
  // editando um OUTRO módulo, embora o drawer já estivesse aberto).
  //
  // NÃO re-roda com oscilações de props (floors, mergedDefaults, etc.).
  //
  // Para tal, capturamos os valores no momento do trigger e os "travamos"
  // via refs durante todo o ciclo de edição do target atual.
  const lastStepperTargetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const targetChanged =
      lastStepperTargetKeyRef.current !== stepperEditingTargetKey;
    const openRisingEdge = isOpen && !prevIsOpenRef.current;

    if ((openRisingEdge || targetChanged) && !moduleId) {
      openMergedDefaultsRef.current = mergedDefaults;
      openInitialSelectedFloorsRef.current = initialSelectedFloors ?? null;
      openInitialModuleDataRef.current = initialModuleData ?? null;
      openInitialDataIsFlatV2Ref.current = initialDataIsFlatV2;
      openFloorsRef.current = floors ?? null;

      form.reset(openMergedDefaultsRef.current as any);
      setUserTouchedSelectedFloors(false);
      prevSelectedFloorsRef.current = [];

      if (stepperMode) {
        let nextSelected: string[] = [];
        const initSel = openInitialSelectedFloorsRef.current;
        const initData = openInitialModuleDataRef.current as any;
        const isFlat = openInitialDataIsFlatV2Ref.current;
        const flr = openFloorsRef.current ?? [];

        if (initSel && initSel.length > 0) {
          nextSelected = initSel;
        } else if (
          isFlat &&
          initData?.floor_ids &&
          Array.isArray(initData.floor_ids) &&
          initData.floor_ids.length > 0
        ) {
          nextSelected = initData.floor_ids as string[];
        } else if (
          initData?.floor_index !== null &&
          initData?.floor_index !== undefined &&
          flr.length > 0
        ) {
          const mapped = mapFloorIndexToFloorIds(initData.floor_index, flr);
          if (mapped.length > 0) {
            nextSelected = mapped;
          }
        }
        setSelectedFloors(nextSelected);
        prevSelectedFloorsRef.current = nextSelected;
      }
      queueMicrotask(() => {
        void form.trigger();
      });
    }

    // Atualiza refs para a próxima renderização
    prevIsOpenRef.current = isOpen;
    lastStepperTargetKeyRef.current = stepperEditingTargetKey;

    // Deps MINIMAS intencionais: só as que disparam a ação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, moduleId, stepperMode, stepperEditingTargetKey, form]);

  // (B) Ajuste TARDIO do selectedFloors — quando a prop `floors` chegar
  // assincronamente (query da unidade) E o usuário AINDA NÃO tocou nos
  // checkboxes e ainda não temos nenhum pavimento selecionado.
  useEffect(() => {
    if (!isOpen || moduleId || !stepperMode) return;
    if (!floors || floors.length === 0) return;
    if (userTouchedSelectedFloors) return;
    if (selectedFloors.length > 0) return;

    let newSelected: string[] = [];
    if (initialSelectedFloors && initialSelectedFloors.length > 0) {
      newSelected = initialSelectedFloors;
    } else if (
      initialDataIsFlatV2 &&
      (initialModuleData as any)?.floor_ids &&
      Array.isArray((initialModuleData as any).floor_ids) &&
      (initialModuleData as any).floor_ids.length > 0
    ) {
      newSelected = (initialModuleData as any).floor_ids as string[];
    } else if (
      (initialModuleData as any)?.floor_index !== null &&
      (initialModuleData as any)?.floor_index !== undefined
    ) {
      newSelected = mapFloorIndexToFloorIds(
        (initialModuleData as any).floor_index,
        floors,
      );
    }

    if (newSelected.length > 0) {
      setSelectedFloors(newSelected);
      prevSelectedFloorsRef.current = newSelected;
      queueMicrotask(() => {
        void form.trigger();
      });
    }
  }, [
    isOpen,
    moduleId,
    stepperMode,
    floors,
    initialSelectedFloors,
    initialModuleData,
    initialDataIsFlatV2,
    userTouchedSelectedFloors,
    selectedFloors,
  ]);

  useEffect(() => {
    if (moduleData) {
      const moduleWithType = moduleData as any;
      const detectedType = moduleWithType.type || type;
      const grouped = flatV2ToGroupedForm(detectedType, moduleWithType);

      const floorIdsFromGrouped = (grouped as any).floor_ids;
      if (floorIdsFromGrouped) {
        setSelectedFloors(floorIdsFromGrouped);
      }

      form.reset(grouped as any);
      queueMicrotask(() => {
        void form.trigger();
      });
    }
  }, [moduleData, moduleId, type, form]);

  const handleSubmit = (_data: any) => {
    const moduleType = (_data as any).type || type;

    const flatData = groupedFormToFlatV2(
      moduleType,
      _data as TModuleGroupedForm,
      selectedFloors,
      unitId,
    );

    const cleanedFlat = cleanZeroItemsBeforeSubmit(flatData as any);

    const baseFields: ModuleParamsPropsV2 = {
      type: moduleType,
      data: cleanedFlat as any,
    };

    if (stepperMode) {
      onSubmitSuccess?.({
        moduleId,
        params: baseFields,
        selectedFloors,
        formInput: form.getValues(),
        flatData: flatData as any,
      });
      return;
    }

    if (moduleId && moduleData) {
      mutateModule(baseFields);
    } else {
      mutateCreation(baseFields);
    }
  };

  const getFormErrorMessages = (errors: any): string[] => {
    const messages = new Set<string>();
    const traverse = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      if (typeof obj.message === "string" && obj.message.length > 0) {
        messages.add(obj.message);
        return;
      }
      for (const key of Object.keys(obj)) {
        if (key !== "message" && key !== "type" && key !== "ref") {
          traverse(obj[key]);
        }
      }
    };
    traverse(errors);
    return Array.from(messages);
  };

  const handleClose = () => {
    if (stepperMode) {
      form.reset(mergedDefaults as any);
      setSelectedFloors(initialSelectedFloors ?? []);
    } else {
      form.reset(getDefaultValuesByType(type) as any);
      setSelectedFloors([]);
    }
    setIsOpen(false);
  };

  const shouldRenderTrigger = !stepperMode || Boolean(triggerComponent);

  const structureTypes = [
    { value: "beam_column", label: t.modules.structureTypes.beamColumn },
    { value: "concrete_wall", label: t.modules.structureTypes.concreteWall },
    { value: "structural_masonry", label: t.modules.structureTypes.masonry },
    {
      value: "raft_foundation",
      label: t.modules.structureTypes.raftFoundation,
    },
    {
      value: "piles_foundation",
      label: t.modules.structureTypes.pilesFoundation,
    },
    {
      value: "raft_piles_foundation",
      label: t.modules.structureTypes.raftPilesFoundation,
    },
  ];

  const isMobile = useIsMobile();

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      dismissible={false}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
          if (
            type &&
            (type === "beam_column" ||
              type === "concrete_wall" ||
              type === "structural_masonry" ||
              type === "raft_foundation" ||
              type === "piles_foundation" ||
              type === "raft_piles_foundation")
          ) {
            form.setValue("type", type);
          }
        }
      }}
      onClose={handleClose}
    >
      {shouldRenderTrigger && (
        <DrawerTrigger asChild>
          {triggerComponent ?? (
            <button className="cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent">
              <Plus />
            </button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent
        className={cn("min-w-4/6", {
          "w-full h-[80vh]": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-h1 text-primary">
            {moduleId ? t.modules.form.editTitle : t.modules.table.createButton}
          </DrawerTitle>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <div className="mx-auto w-full p-6 pr-0 pt-0 flex overflow-auto max-sm:flex-col max-sm:flex-1 max-sm:min-h-0">
          {isLoadingModule ? (
            <div className="grid w-full grid-cols-3 gap-4">
              <div className="flex flex-col w-full h-auto space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex flex-col col-span-2 w-full h-auto space-y-2 p-4 border rounded-lg border-muted ">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit as any, () => {
                  if (!stepperMode) {
                    toast.error(t.modules.form.validationErrors, {
                      description: t.modules.form.validationDescription,
                      duration: 5000,
                    });
                  }
                })}
                id="module-form"
                className="w-full flex gap-6 h-full max-sm:flex-col"
              >
                <div
                  className={cn("h-full overflow-y-auto", {
                    "shrink-0": !isMobile,
                    "h-auto flex-1 mx-auto": isMobile,
                  })}
                >
                  <div
                    className={cn("top-0", {
                      sticky: !isMobile,
                      "w-full": isMobile,
                    })}
                  >
                    <BuildingVisualizer
                      key={`building-${floors?.length || 0}-${JSON.stringify(floors?.map((f) => ({ index: f.index })))}`}
                      towerFloors={floors || []}
                      isSelectable={isUsingPaviments}
                      selectedFloorIds={selectedFloors}
                      onCheckFloorId={setSelectedFloors}
                      complete={true}
                      isFoundation={!isUsingPaviments}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="p-4 border rounded-lg border-gray-shade-200 space-y-4 bg-card">
                    <div>
                      <span className="text-h3 text-primary dark:text-gray-300">
                        {t.modules.form.technologyData}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control as any}
                        name="type"
                        disabled={Boolean(moduleId)}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t.modules.form.structureTypeLabel}
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (
                                    value === "beam_column" ||
                                    value === "concrete_wall" ||
                                    value === "structural_masonry" ||
                                    value === "raft_foundation" ||
                                    value === "piles_foundation" ||
                                    value === "raft_piles_foundation"
                                  ) {
                                    form.reset(
                                      getDefaultValuesByType(
                                        value as
                                          | "beam_column"
                                          | "concrete_wall"
                                          | "structural_masonry"
                                          | "raft_foundation"
                                          | "piles_foundation"
                                          | "raft_piles_foundation",
                                      ) as any,
                                    );
                                  }
                                }}
                                value={field.value}
                                disabled={Boolean(moduleId)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={
                                      t.modules.form.structureTypeLabel
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {structureTypes.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {(() => {
                      switch (structureTypeWatch) {
                        case "beam_column":
                          return (
                            <ModuleFormBeamColumn
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        case "concrete_wall":
                          return (
                            <ModuleFormConcreteWall
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        case "structural_masonry":
                          return (
                            <ModuleFormStructuralMasonry
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        case "raft_foundation":
                          return (
                            <ModuleFormRaftFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        case "piles_foundation":
                          return (
                            <ModuleFormPilesFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        case "raft_piles_foundation":
                          return (
                            <ModuleFormRaftPilesFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                              source={source}
                            />
                          );
                        default:
                          return null;
                      }
                    })()}
                  </div>
                </div>
              </form>
            </Form>
          )}
        </div>
        <DrawerFooter className="px-8">
          {partialWarnings.hasWarnings && (
            <Alert className="bg-orange-50 border-orange-200 text-orange-900">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <p className="font-medium mb-1">
                  {t.modules.form.partialDataWarning}
                </p>
                <p className="text-xs mb-2 text-orange-800">
                  {t.modules.form.partialDataDescription}
                </p>
                <p className="text-xs font-medium mb-1 text-orange-900">
                  {t.modules.form.partialDataHint}
                </p>
                <ul className="list-disc pl-4 text-xs space-y-0.5 text-orange-800">
                  {partialWarnings.messages.slice(0, 10).map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                  {partialWarnings.messages.length > 10 && (
                    <li>… (+{partialWarnings.messages.length - 10} mais)</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {(stepperMode || form.formState.isSubmitted) &&
            strictValidation &&
            partialWarnings.hasWarnings && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{t.modules.form.fixErrors}</p>
                  <ul className="list-disc pl-4 text-xs space-y-0.5">
                    {partialWarnings.messages.slice(0, 10).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                    {partialWarnings.messages.length > 10 && (
                      <li>… (+{partialWarnings.messages.length - 10} mais)</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          <Button
            type="submit"
            variant="bipc"
            className="w-full"
            form="module-form"
            disabled={
              isCreationPending ||
              isUpdatePending ||
              (selectedFloors.length === 0 && isUsingPaviments) ||
              (strictValidation &&
                form.formState.isSubmitted &&
                partialWarnings.hasWarnings)
            }
          >
            {isCreationPending || isUpdatePending ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : moduleId ? (
              t.common.update
            ) : (
              t.common.add
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
