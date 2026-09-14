import { getUnitByUUID } from "@/actions/units/getUnit";
import { patchUnit } from "@/actions/units/patchUnit";
import { postUnit } from "@/actions/units/postUnit";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { convertUnitToFormData } from "@/utils/unitConversions";
import {
  UnitFormInput,
  UnitFormSchema,
  createUnitFormSchema,
  FloorFormInput,
} from "@/validators/unitForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Alert, AlertDescription } from "../../ui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../ui/drawer";
import { Form } from "../../ui/form";
import UnitFormTower from "./unit-form-tower";
import { initialFloors } from "./initial-floors";

interface DrawerFormUnitProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId?: string;
  editMode?: boolean;

  stepperMode?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialFormData?: UnitFormInput;
  onSubmitSuccess?: (payload: {
    unitId?: string;
    data: UnitFormSchema;
    formInput: UnitFormInput;
    unit: any;
  }) => void;
}

const DrawerFormUnit = ({
  triggerComponent,
  projectId,
  unitId,
  editMode = false,
  stepperMode = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialFormData,
  onSubmitSuccess,
}: DrawerFormUnitProps) => {
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

  const defaultValues = useMemo<UnitFormInput>(() => {
    if (initialFormData) return initialFormData as UnitFormInput;
    return {
      name: "",
      type: "tower" as const,
      repetition_count: 1,
      data: {
        floors: initialFloors as unknown as FloorFormInput[],
      },
    };
  }, [initialFormData]);

  const { t } = useTranslation();

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<UnitFormInput, any, UnitFormSchema>({
    resolver: zodResolver(createUnitFormSchema(t)) as any,
    defaultValues,
    mode: "all",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (!stepperMode || !isOpen) return;
    void form.trigger();
  }, [stepperMode, isOpen, form]);

  const watchedValues = form.watch();

  const collectZodMessages = (values: unknown): string[] => {
    const parsed = createUnitFormSchema(t).safeParse(values);
    if (parsed.success) return [];
    const messages = new Set<string>();
    for (const issue of parsed.error.issues) {
      if (issue.message) messages.add(issue.message);
    }
    return Array.from(messages);
  };

  const currentErrorMsgs = useMemo(
    () => collectZodMessages(watchedValues),
    [watchedValues, t],
  );

  const lastWatchSigRef = useRef<string>("");
  useEffect(() => {
    if (!isOpen) return;
    const sig = JSON.stringify(watchedValues);
    if (sig === lastWatchSigRef.current) return;
    lastWatchSigRef.current = sig;
    const tId = setTimeout(() => {
      void form.trigger([
        "name",
        "type",
        "repetition_count",
        "housing_units_count",
        "data.floors",
      ]);
    }, 80);
    return () => clearTimeout(tId);
  }, [watchedValues, isOpen, form]);

  const {
    isPending: isCreationPending,
    mutate: mutateCreation,
    reset: resetCreation,
  } = useMutation({
    mutationFn: (data: UnitFormSchema) => postUnit(data, projectId),
    onError: (error) => {
      if (!stepperMode) {
        toast.error(t.units.form.createError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: (data, variables) => {
      if (!stepperMode) {
        toast.success(t.units.form.createSuccess, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        setIsOpen(false);
        form.reset();
      }

      if (stepperMode) {
        onSubmitSuccess?.({
          unitId: data.data.unit?.id,
          data: variables,
          formInput: form.getValues(),
          unit: data.data.unit,
        });
      } else if (data.data.unit) {
        navigate({
          to: `/new_projects/${data.data.unit.project_id}/`,
          from: "/new_projects",
        })
          .then(() => null)
          .catch((err: unknown) => err);
      }
    },
  });

  const { isPending: isUpdatePending, mutate: mutateUpdate } = useMutation({
    mutationFn: (data: UnitFormSchema) => patchUnit(data, projectId, unitId!),
    onError: (error) => {
      if (!stepperMode) {
        toast.error(t.units.form.updateError, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      }
    },
    onSuccess: async (_data, variables) => {
      if (!stepperMode) {
        toast.success(t.units.form.updateSuccess, {
          duration: 5000,
        });
        await queryClient.invalidateQueries({
          queryKey: ["unit", projectId, unitId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["projects"],
        });
        setIsOpen(false);
        form.reset();
      } else {
        onSubmitSuccess?.({
          unitId,
          data: variables,
          formInput: form.getValues(),
          unit: null,
        });
      }
    },
  });

  const handleSubmit = (data: UnitFormSchema) => {
    if (stepperMode) {
      const formInput = form.getValues();
      if (unitId) {
        onSubmitSuccess?.({
          unitId,
          data,
          formInput,
          unit: null,
        });
        return;
      }
      onSubmitSuccess?.({
        data,
        formInput,
        unit: null,
      });
      return;
    }

    if (unitId) {
      mutateUpdate(data);
      return;
    }

    // No modo de criação, expandir pavimentos com repetition > 1
    // Pegar os dados do form antes da validação para ter acesso ao repetition
    const formData = form.getValues();

    const expandedFloors: any[] = [];

    formData.data.floors.forEach((floor: FloorFormInput) => {
      const repetition = floor.repetition || 1;

      // Converter strings para números
      const areaNum = parseFloat(floor.area.replace(",", "."));
      const heightNum = parseFloat(floor.height.replace(",", "."));

      for (let i = 0; i < repetition; i++) {
        expandedFloors.push({
          floor_group: floor.floor_group,
          area: areaNum,
          height: heightNum,
          category: floor.category,
          index: floor.index + i,
        });
      }
    });

    // Recalcular índices para garantir continuidade
    const sortedFloors = expandedFloors.sort((a, b) => a.index - b.index);
    const minIndex = sortedFloors[0]?.index || 0;

    const reindexedFloors = sortedFloors.map((floor, idx) => ({
      ...floor,
      index: minIndex + idx,
    }));

    const createData = {
      name: data.name,
      type: data.type,
      ...(data.housing_units_count && {
        housing_units_count: data.housing_units_count,
      }),
      ...(data.repetition_count && { repetition_count: data.repetition_count }),
      data: {
        floors: reindexedFloors,
      },
    };

    mutateCreation(createData as any);
  };

  const handleSubmitError = (errors: FieldErrors<UnitFormInput>) => {
    console.error("Erro de validação do formulário:", errors);
  };

  const handleClose = () => {
    form.reset();
    resetCreation();
    setIsOpen(false);
  };

  const { data: unitData, isLoading: isLoadingUnitFields } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: async () => {
      if (unitId) {
        const res = await getUnitByUUID(projectId, unitId);
        return { unit: res.data.unit, roles: res.data.roles };
      }
      return null;
    },
    enabled: !!unitId,
  });

  useEffect(() => {
    if (unitData?.unit) {
      const formData = convertUnitToFormData(unitData?.unit);
      form.reset(formData);
    }
  }, [unitData, form]);

  useEffect(() => {
    if (stepperMode && initialFormData && isOpen) {
      form.reset(initialFormData as any);
    }
  }, [stepperMode, initialFormData, isOpen, form]);

  const isMobile = useIsMobile();

  const shouldRenderTrigger = !stepperMode || Boolean(triggerComponent);

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={handleClose}
      dismissible={false}
    >
      {shouldRenderTrigger && (
        <DrawerTrigger asChild>
          {triggerComponent ?? (
            <Button
              variant={"secondary"}
              className="cursor-pointer rounded-t-lg px-4 py-2 text-white"
            >
              <Plus />
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent
        className={cn("min-w-4/5", {
          "w-full h-4/5": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-2xl font-bold text-primary">
            {Boolean(unitId) || editMode
              ? t.units.form.editTitle
              : t.units.form.addTitle}
          </DrawerTitle>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <>
          {isLoadingUnitFields ? (
            <div className="flex h-20 w-full items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit, handleSubmitError)}
                className="flex flex-col gap-3 overflow-y-auto p-8"
                id="unit-form"
              >
                {form.watch("type") === "tower" && (
                  <UnitFormTower
                    form={form}
                    isEditMode={Boolean(unitId) || editMode}
                  />
                )}
              </form>
            </Form>
          )}
        </>
        <DrawerFooter className="px-8 flex flex-col gap-3">
          {currentErrorMsgs.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">
                  {t.units.form.validationSummary}
                </p>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                  {currentErrorMsgs.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2 justify-end flex-row w-full">
            {!(Boolean(unitId) || editMode) && (
              <>
                <Button
                  type="submit"
                  variant="bipc"
                  form="unit-form"
                  disabled={isCreationPending}
                >
                  {t.units.form.addButton}
                  {isCreationPending && (
                    <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                  )}
                </Button>
              </>
            )}
          </div>
          {(Boolean(unitId) || editMode) && (
            <div className="flex flex-col w-full gap-4">
              {!stepperMode && (
                <div className="p-5 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
                  <div className="flex items-start gap-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                        {t.units.form.updateWarningTitle}
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                        {t.units.form.updateWarningBody}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                variant="bipc"
                className="w-full"
                form="unit-form"
                disabled={isUpdatePending}
              >
                {t.units.form.editButton}
                {isUpdatePending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                )}
              </Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormUnit;
