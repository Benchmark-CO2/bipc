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
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
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
} from "./aggregate-helpers";

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId: string;
  optionId: string;
  moduleId?: string;
  type: TModulesTypes;
  floors?: TTowerFloorCategory[];

  stepperMode?: boolean;
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
  unitId,
  optionId,
  moduleId,
  type,
  floors = [],
  stepperMode = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialModuleData,
  initialSelectedFloors,
  onSubmitSuccess,
}: DrawerFormModuleProps) => {
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
    if (result.success) {
      return { values: values as any, errors: {} };
    }
    const fieldErrors: Record<string, any> = {};
    const issues = result.error?.issues ?? [];
    for (const issue of issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = {
          type: "custom",
          message: issue.message,
        };
      }
    }
    return { values: {} as any, errors: fieldErrors };
  };

  const form = useForm<ModuleFormState>({
    resolver: customModuleResolver as any,
    defaultValues: mergedDefaults,
  });

  const structureTypeWatch = form.watch("type");

  useEffect(() => {
    if (stepperMode && isOpen) {
      form.reset(mergedDefaults as any);
      if (initialSelectedFloors) {
        setSelectedFloors(initialSelectedFloors);
      } else if (initialDataIsFlatV2 && (initialModuleData as any)?.floor_ids) {
        setSelectedFloors((initialModuleData as any).floor_ids);
      }
      void form.trigger();
    }
  }, [
    stepperMode,
    isOpen,
    initialModuleData,
    initialSelectedFloors,
    mergedDefaults,
    form,
    initialDataIsFlatV2,
  ]);

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
                            />
                          );
                        case "concrete_wall":
                          return (
                            <ModuleFormConcreteWall
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                            />
                          );
                        case "structural_masonry":
                          return (
                            <ModuleFormStructuralMasonry
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                            />
                          );
                        case "raft_foundation":
                          return (
                            <ModuleFormRaftFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                            />
                          );
                        case "piles_foundation":
                          return (
                            <ModuleFormPilesFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
                            />
                          );
                        case "raft_piles_foundation":
                          return (
                            <ModuleFormRaftPilesFoundation
                              form={form as any}
                              stepperMode={stepperMode}
                              isSubmitted={form.formState.isSubmitted}
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
          {(stepperMode || form.formState.isSubmitted) &&
            Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{t.modules.form.fixErrors}</p>
                  <ul className="list-disc pl-4 text-xs space-y-0.5">
                    {getFormErrorMessages(form.formState.errors).map(
                      (msg, i) => (
                        <li key={i}>{msg}</li>
                      ),
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
              (form.formState.isSubmitted &&
                Object.keys(form.formState.errors).length > 0)
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
