import { getModule } from "@/actions/modules/getModule";
import { patchModule } from "@/actions/modules/patchModule";
import { postModule } from "@/actions/modules/postModule";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { ModuleParamsProps, TModulesTypes } from "@/types/modules";
import { TTowerFloorCategory } from "@/types/units";
import {
  ModuleFormInput,
  ModuleFormSchema,
  moduleFormSchema,
} from "@/validators/moduleFormByType.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { /*Loader2,*/ Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  FormMessage,
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

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId: string;
  optionId: string;
  moduleId?: string;
  type: TModulesTypes;
  floors?: TTowerFloorCategory[];
}

const DrawerFormModule = ({
  triggerComponent,
  projectId,
  unitId,
  optionId,
  moduleId,
  type,
  floors = [],
}: DrawerFormModuleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);

  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<ModuleFormInput>({
    resolver: zodResolver(moduleFormSchema) as any,
    defaultValues: getDefaultValuesByType(type) as any,
  });

  const { mutate: mutateModule, isPending: isUpdatePending } = useMutation({
    mutationFn: (data: ModuleParamsProps) =>
      patchModule(data, projectId, unitId, optionId, moduleId!),
    onError: (error) => {
      toast.error(t("error.errorUpdateModule"), {
        description:
          error instanceof Error ? error.message : t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.moduleUpdated"), {
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
      form.reset();
      setIsOpen(false);
    },
  });
  const { isPending: isCreationPending, mutate: mutateCreation } = useMutation({
    mutationFn: (data: ModuleParamsProps) =>
      postModule(data, projectId, unitId, optionId),
    onError: (error) => {
      toast.error(t("error.errorCreateModule"), {
        description:
          error instanceof Error ? error.message : t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.moduleCreated"), {
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
      form.reset();
      setIsOpen(false);
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
    enabled: !!moduleId && isOpen,
  });


  useEffect(() => {
    const ensureArraysInitialized = () => {
      const currentType = form.getValues("type");

      if (currentType === "beam_column") {
        const fieldsToInit = [
          "concrete_columns",
          "concrete_beams",
          "concrete_slabs",
        ] as const;

        fieldsToInit.forEach((field) => {
          if (!form.getValues(field)) {
            form.setValue(field, { volumes: [], steel: [] });
          }
        });
      } else if (currentType === "concrete_wall") {
        const fieldsToInit = ["concrete_walls", "concrete_slabs"] as const;

        fieldsToInit.forEach((field) => {
          if (!form.getValues(field)) {
            form.setValue(field, { volumes: [], steel: [] });
          }
        });
      } else if (currentType === "structural_masonry") {
        if (!form.getValues("concrete_slabs")) {
          form.setValue("concrete_slabs", { volumes: [], steel: [] });
        }
      }
    };

    ensureArraysInitialized();
  }, [form]);

  useEffect(() => {
    if (moduleData) {
      const { floor_ids, ...rest } = moduleData;

      setSelectedFloors(floor_ids || []);

      if (
        rest.type === "beam_column" ||
        rest.type === "concrete_wall" ||
        rest.type === "structural_masonry"
      ) {
        const restAny = rest as any;
        const convertedData = {
          ...rest,
          // Converter concrete_columns, concrete_beams, concrete_slabs, concrete_walls
          ...(restAny.concrete_columns && {
            concrete_columns: {
              volumes: restAny.concrete_columns.volumes.map((c: any) => ({
                fck: c.fck,
                volume: String(c.volume || 0),
              })),
              steel: restAny.concrete_columns.steel.map((c: any) => ({
                ca: c.ca || 50,
                mass: String(c.mass || 0),
              })),
            },
          }),
          ...(restAny.concrete_beams && {
            concrete_beams: {
              volumes: restAny.concrete_beams.volumes.map((c: any) => ({
                fck: c.fck,
                volume: String(c.volume || 0),
              })),
              steel: restAny.concrete_beams.steel.map((c: any) => ({
                ca: c.ca || 50,
                mass: String(c.mass || 0),
              })),
            },
          }),
          ...(restAny.concrete_slabs && {
            concrete_slabs: {
              volumes: restAny.concrete_slabs.volumes.map((c: any) => ({
                fck: c.fck,
                volume: String(c.volume || 0),
              })),
              steel: restAny.concrete_slabs.steel.map((c: any) => ({
                ca: c.ca || 50,
                mass: String(c.mass || 0),
              })),
            },
          }),
          ...(restAny.concrete_walls && {
            concrete_walls: {
              volumes: restAny.concrete_walls.volumes.map((c: any) => ({
                fck: c.fck,
                volume: String(c.volume || 0),
              })),
              steel: restAny.concrete_walls.steel.map((c: any) => ({
                ca: c.ca || 50,
                mass: String(c.mass || 0),
              })),
            },
          }),
          // Converter campos de concrete_wall para string
          ...(rest.type === "concrete_wall" && {
            wall_thickness: String(restAny.wall_thickness || 0),
            slab_thickness: String(restAny.slab_thickness || 0),
            wall_area: String(restAny.wall_area || 0),
            wall_form_area: String(restAny.wall_form_area || 0),
            slab_form_area: String(restAny.slab_form_area || 0),
          }),
        };
        form.reset(convertedData as any);
      } else {
        form.reset(getDefaultValuesByType(type) as any);
      }
    }
  }, [moduleData, moduleId, type, form]);

  const handleSubmit = (data: ModuleFormSchema) => {
    if (moduleId && moduleData) {
      const { floor_ids: _floor_ids, ...rest } = moduleData;
      const baseFields: ModuleParamsProps = {
        type,
        data: {
          ...rest,
          floor_ids: selectedFloors,
        } as any,
      };
      mutateModule(baseFields);
      return;
    }

    let filteredData = {};

    if (data.type === "beam_column") {
      filteredData = {
        concrete_columns: data.concrete_columns || { volumes: [], steel: [] },
        concrete_beams: data.concrete_beams || { volumes: [], steel: [] },
        concrete_slabs: data.concrete_slabs || { volumes: [], steel: [] },
        form_columns: data.form_columns,
        form_beams: data.form_beams,
        form_slabs: data.form_slabs,
        column_number: data.column_number,
        avg_beam_span: data.avg_beam_span,
        avg_slab_span: data.avg_slab_span,
      };
    } else if (data.type === "concrete_wall") {
      filteredData = {
        concrete_walls: data.concrete_walls || { volumes: [], steel: [] },
        concrete_slabs: data.concrete_slabs || { volumes: [], steel: [] },
        wall_thickness: data.wall_thickness,
        slab_thickness: data.slab_thickness,
        wall_area: data.wall_area,
        slab_area: data?.slab_area || 0,
        wall_form_area: data.wall_form_area,
        slab_form_area: data.slab_form_area,
      };
    } else if (data.type === "structural_masonry") {
      filteredData = {
        masonry: {
          blocks: data.blocks || [],
          grout: data.grout || [],
          mortar: data.mortar || [],
        },
        concrete_slabs: data.concrete_slabs || { volumes: [], steel: [] },
        ...(data.concrete_columns && {
          concrete_columns: data.concrete_columns,
        }),
        ...(data.concrete_beams && { concrete_beams: data.concrete_beams }),
        form_slabs: data.form_slabs || 0,
        ...(data.form_columns !== undefined && {
          form_columns: data.form_columns,
        }),
        ...(data.form_beams !== undefined && { form_beams: data.form_beams }),
      };
    }

    const baseFields: ModuleParamsProps = {
      type: data.type,
      data: {
        ...filteredData,
        floor_ids: selectedFloors,
      },
    };

    mutateCreation(baseFields);
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const structureTypes = [
    { value: "beam_column", label: t("common.structureType.beamColumn") },
    { value: "concrete_wall", label: t("common.structureType.concreteWall") },
    { value: "structural_masonry", label: t("common.structureType.masonry") },
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
              type === "structural_masonry")
          ) {
            form.setValue("type", type);
          }
        }
      }}
      onClose={handleClose}
    >
      <DrawerTrigger asChild>
        {triggerComponent ?? (
          <button className="cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent">
            <Plus />
          </button>
        )}
      </DrawerTrigger>
      <DrawerContent className={cn("min-w-4/6", {
        "w-full h-[80vh]": isMobile,
      })}>
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-2xl font-bold text-primary">
            {moduleId
              ? "Editar Módulo de Cálculo"
              : "Adicionar Módulo de Cálculo"}
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
                onSubmit={form.handleSubmit(handleSubmit as any, (errors) => {
                  toast.error("Existem erros de validação", {
                    description:
                      "Evite campos com valores zerados ou inválidos.",
                    duration: 5000,
                  });
                })}
                id="module-form"
                className="w-full flex gap-6 h-full max-sm:flex-col"
              >
                <div className={cn("h-full overflow-y-auto", {
                  'shrink-0': !isMobile,
                  'h-auto flex-1 mx-auto': isMobile,
                })}>
                  <div className={cn("top-0", {
                    'sticky': !isMobile,
                    'w-full': isMobile,
                  })}>
                    <BuildingVisualizer
                      key={`building-${floors?.length || 0}-${JSON.stringify(floors?.map((f) => ({ index: f.index })))}`}
                      towerFloors={floors || []}
                      isSelectable={true}
                      selectedFloorIds={selectedFloors}
                      onCheckFloorId={setSelectedFloors}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="p-4 border rounded-lg border-gray-shade-200 space-y-4 bg-card">
                    <div>
                      <span className="text-md font-semibold leading-2 text-primary dark:text-gray-300">
                        Dados da tecnologia
                      </span>
                    </div>
                    {/* Campos básicos */}
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control as any}
                        name="type"
                        disabled={Boolean(moduleId)}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t(
                                "drawerFormModule.commonForm.structureTypeLabel"
                              )}
                            </FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (
                                    value === "beam_column" ||
                                    value === "concrete_wall" ||
                                    value === "structural_masonry"
                                  ) {
                                    form.reset(
                                      getDefaultValuesByType(value as 'beam_column' | 'concrete_wall' | 'structural_masonry') as any,
                                    );
                                  }
                                }}
                                value={field.value}
                                disabled={Boolean(moduleId)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={t(
                                      "drawerFormModule.commonForm.structureTypePlaceholder"
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {structureTypes.map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {/* Campos específicos por tipo de estrutura */}
                    {(() => {
                      const structureType = form.watch("type");

                      switch (structureType) {
                        case "beam_column":
                          return <ModuleFormBeamColumn form={form as any} />;
                        case "concrete_wall":
                          return <ModuleFormConcreteWall form={form as any} />;
                        case "structural_masonry":
                          return (
                            <ModuleFormStructuralMasonry form={form as any} />
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
          <Button
            type="submit"
            variant="bipc"
            className="w-full"
            form="module-form"
            disabled={
              isCreationPending ||
              isUpdatePending ||
              selectedFloors.length === 0
            }
          >
            {isCreationPending || isUpdatePending ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : moduleId ? (
              t("common.update")
            ) : (
              t("common.add")
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
