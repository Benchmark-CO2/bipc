import { getModule } from "@/actions/modules/getModule";
import { patchModule } from "@/actions/modules/patchModule";
import { postModule } from "@/actions/modules/postModule";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
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
import ModuleFormRaftFoundation from "./module-form-raft-foundation";
import ModuleFormPilesFoundation from "./module-form-piles-foundation";
import ModuleFormRaftPilesFoundation from "./module-form-raft-piles-foundation";

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

  const structureTypeWatch = form.watch("type");

  const isUsingPaviments =
    structureTypeWatch === "beam_column" ||
    structureTypeWatch === "concrete_wall" ||
    structureTypeWatch === "structural_masonry";

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

      const toLocalString = (
        value: number | string | null | undefined
      ): string => {
        if (value === null || value === undefined) return "0";
        if (value === "" || value === "0" || value === 0) return "0";
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(numValue)) return "0";

        const formatted = numValue.toInternational("pt-BR", 2);
        return typeof formatted === "number" ? String(formatted) : formatted;
      };

      if (
        rest.type === "beam_column" ||
        rest.type === "concrete_wall" ||
        rest.type === "structural_masonry" ||
        rest.type === "raft_foundation" ||
        rest.type === "piles_foundation" ||
        rest.type === "raft_piles_foundation"
      ) {
        const restAny = rest as any;
        const defaults = getDefaultValuesByType(rest.type);

        const convertedData = {
          ...rest,

          // Concrete columns - usa default se não existir
          concrete_columns: restAny.concrete_columns
            ? {
                volumes: restAny.concrete_columns.volumes.map((c: any) => ({
                  fck: c.fck,
                  volume: toLocalString(c.volume),
                })),
                steel: restAny.concrete_columns.steel.map((c: any) => ({
                  ca: c.ca || 50,
                  mass: toLocalString(c.mass),
                })),
              }
            : (defaults as any).concrete_columns,

          // Concrete beams - usa default se não existir
          concrete_beams: restAny.concrete_beams
            ? {
                volumes: restAny.concrete_beams.volumes.map((c: any) => ({
                  fck: c.fck,
                  volume: toLocalString(c.volume),
                })),
                steel: restAny.concrete_beams.steel.map((c: any) => ({
                  ca: c.ca || 50,
                  mass: toLocalString(c.mass),
                })),
              }
            : (defaults as any).concrete_beams,

          // Concrete slabs - usa default se não existir
          concrete_slabs: restAny.concrete_slabs
            ? {
                volumes: restAny.concrete_slabs.volumes.map((c: any) => ({
                  fck: c.fck,
                  volume: toLocalString(c.volume),
                })),
                steel: restAny.concrete_slabs.steel.map((c: any) => ({
                  ca: c.ca || 50,
                  mass: toLocalString(c.mass),
                })),
              }
            : (defaults as any).concrete_slabs,

          // Concrete walls - usa default se não existir
          concrete_walls: restAny.concrete_walls
            ? {
                volumes: restAny.concrete_walls.volumes.map((c: any) => ({
                  fck: c.fck,
                  volume: toLocalString(c.volume),
                })),
                steel: restAny.concrete_walls.steel.map((c: any) => ({
                  ca: c.ca || 50,
                  mass: toLocalString(c.mass),
                })),
              }
            : (defaults as any).concrete_walls,

          // Beam column specific fields
          ...(rest.type === "beam_column" && {
            form_columns: toLocalString(restAny.form_columns ?? 0),
            form_beams: toLocalString(restAny.form_beams ?? 0),
            form_slabs: toLocalString(restAny.form_slabs ?? 0),
            column_number: toLocalString(restAny.column_number ?? 0),
            avg_beam_span: toLocalString(restAny.avg_beam_span ?? 0),
            avg_slab_span: toLocalString(restAny.avg_slab_span ?? 0),
          }),

          // Concrete wall specific fields
          ...(rest.type === "concrete_wall" && {
            wall_thickness: toLocalString(restAny.wall_thickness ?? 0),
            slab_thickness: toLocalString(restAny.slab_thickness ?? 0),
            wall_area: toLocalString(restAny.wall_area ?? 0),
            slab_area: restAny.slab_area ?? 0,
            wall_form_area: toLocalString(restAny.wall_form_area ?? 0),
            slab_form_area: toLocalString(restAny.slab_form_area ?? 0),
          }),

          // Raft foundation specific fields
          ...(rest.type === "raft_foundation" && {
            area: toLocalString(restAny.area ?? 0),
            thickness: toLocalString(restAny.thickness ?? 0),
            fck: restAny.fck ?? (defaults as any).fck,
            steel: {
              mesh: toLocalString(restAny.steel?.mesh ?? 0),
              ca50: toLocalString(restAny.steel?.ca50 ?? 0),
              ca60: toLocalString(restAny.steel?.ca60 ?? 0),
              cp190: toLocalString(restAny.steel?.cp190 ?? 0),
            },
          }),

          // Piles foundation specific fields
          ...(rest.type === "piles_foundation" && {
            fck: restAny.fck ?? (defaults as any).fck,
            piles: {
              volume: toLocalString(restAny.piles?.volume ?? 0),
              steel: {
                ca50: toLocalString(restAny.piles?.steel?.ca50 ?? 0),
                ca60: toLocalString(restAny.piles?.steel?.ca60 ?? 0),
              },
            },
            cap_beams: {
              volume: toLocalString(restAny.cap_beams?.volume ?? 0),
              steel: {
                ca50: toLocalString(restAny.cap_beams?.steel?.ca50 ?? 0),
                ca60: toLocalString(restAny.cap_beams?.steel?.ca60 ?? 0),
              },
            },
          }),

          // Raft piles foundation specific fields
          ...(rest.type === "raft_piles_foundation" && {
            raft: {
              area: toLocalString(restAny.raft?.area ?? 0),
              thickness: toLocalString(restAny.raft?.thickness ?? 0),
              fck: restAny.raft?.fck ?? (defaults as any).raft.fck,
              steel: {
                mesh: toLocalString(restAny.raft?.steel?.mesh ?? 0),
                ca50: toLocalString(restAny.raft?.steel?.ca50 ?? 0),
                ca60: toLocalString(restAny.raft?.steel?.ca60 ?? 0),
                cp190: toLocalString(restAny.raft?.steel?.cp190 ?? 0),
              },
            },
            piles: {
              volume: toLocalString(restAny.piles?.volume ?? 0),
              steel: {
                ca50: toLocalString(restAny.piles?.steel?.ca50 ?? 0),
                ca60: toLocalString(restAny.piles?.steel?.ca60 ?? 0),
              },
            },
          }),

          // Structural masonry specific fields
          ...(rest.type === "structural_masonry" && {
            form_slabs: toLocalString(restAny.form_slabs ?? 0),
            form_columns: toLocalString(restAny.form_columns ?? 0),
            form_beams: toLocalString(restAny.form_beams ?? 0),
            blocks: restAny.masonry?.blocks
              ? restAny.masonry.blocks.map((block: any) => ({
                  type: block.type,
                  fbk: block.fbk,
                  quantity: toLocalString(block.quantity),
                }))
              : (defaults as any).blocks,
            grout: restAny.masonry?.grout
              ? restAny.masonry.grout.map((grout: any) => ({
                  position: grout.position,
                  volumes:
                    grout.volumes?.map((v: any) => ({
                      fgk: v.fgk,
                      volume: toLocalString(v.volume),
                    })) || [],
                  steel:
                    grout.steel?.map((s: any) => ({
                      ca: s.ca,
                      mass: toLocalString(s.mass),
                    })) || [],
                }))
              : (defaults as any).grout,
            mortar: restAny.masonry?.mortar
              ? restAny.masonry.mortar.map((mortar: any) => ({
                  fak: mortar.fak,
                  volume: toLocalString(mortar.volume),
                }))
              : (defaults as any).mortar,
          }),
        };

        form.reset(convertedData as any);

        // Garantir que campos numéricos sejam strings após reset
        if (rest.type === "structural_masonry") {
          const currentFormSlabs = form.getValues("form_slabs");
          if (typeof currentFormSlabs === "number") {
            form.setValue("form_slabs", toLocalString(currentFormSlabs));
          }
          const currentFormColumns = form.getValues("form_columns");
          if (
            currentFormColumns !== undefined &&
            typeof currentFormColumns === "number"
          ) {
            form.setValue("form_columns", toLocalString(currentFormColumns));
          }
          const currentFormBeams = form.getValues("form_beams");
          if (
            currentFormBeams !== undefined &&
            typeof currentFormBeams === "number"
          ) {
            form.setValue("form_beams", toLocalString(currentFormBeams));
          }
        }
      } else {
        form.reset(getDefaultValuesByType(type) as any);
      }
    }
  }, [moduleData, moduleId, type, form]);

  const handleSubmit = (data: ModuleFormSchema) => {
    const moduleType = data.type || type;

    let filteredData = {};

    if (moduleType === "beam_column") {
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
    } else if (moduleType === "concrete_wall") {
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
    } else if (moduleType === "structural_masonry") {
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
        ...(data.form_slabs !== undefined &&
          data.form_slabs !== 0 && {
            form_slabs: data.form_slabs,
          }),
        ...(data.form_columns !== undefined &&
          data.form_columns !== 0 && {
            form_columns: data.form_columns,
          }),
        ...(data.form_beams !== undefined &&
          data.form_beams !== 0 && {
            form_beams: data.form_beams,
          }),
      };
    } else if (moduleType === "raft_foundation") {
      filteredData = {
        area: data.area,
        thickness: data.thickness,
        fck: data.fck,
        steel: data.steel,
      };
    } else if (moduleType === "piles_foundation") {
      filteredData = {
        fck: data.fck,
        piles: data.piles,
        cap_beams: data.cap_beams,
      };
    } else if (moduleType === "raft_piles_foundation") {
      filteredData = {
        raft: data.raft,
        piles: data.piles,
      };
    }

    const conditionalFields = isUsingPaviments
      ? {
          floor_ids: selectedFloors,
        }
      : {
          unit_id: unitId,
        };

    const baseFields: ModuleParamsProps = {
      type: moduleType ?? data.type,
      data: {
        ...filteredData,
        ...conditionalFields,
      },
    };

    if (moduleId && moduleData) {
      mutateModule(baseFields);
    } else {
      mutateCreation(baseFields);
    }
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const structureTypes = [
    { value: "beam_column", label: t("common.structureType.beamColumn") },
    { value: "concrete_wall", label: t("common.structureType.concreteWall") },
    { value: "structural_masonry", label: t("common.structureType.masonry") },
    { value: "raft_foundation", label: "Radier" },
    { value: "piles_foundation", label: "Estacas" },
    { value: "raft_piles_foundation", label: "Radier Estaqueado" },
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
      <DrawerTrigger asChild>
        {triggerComponent ?? (
          <button className="cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent">
            <Plus />
          </button>
        )}
      </DrawerTrigger>
      <DrawerContent
        className={cn("min-w-4/6", {
          "w-full h-[80vh]": isMobile,
        })}
      >
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
                onSubmit={form.handleSubmit(handleSubmit as any, () => {
                  toast.error("Existem erros de validação", {
                    description:
                      "Evite campos com valores zerados ou inválidos.",
                    duration: 5000,
                  });
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
                                          | "raft_piles_foundation"
                                      ) as any
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
                      // const structureType = form.watch("type");

                      switch (structureTypeWatch) {
                        case "beam_column":
                          return <ModuleFormBeamColumn form={form as any} />;
                        case "concrete_wall":
                          return <ModuleFormConcreteWall form={form as any} />;
                        case "structural_masonry":
                          return (
                            <ModuleFormStructuralMasonry form={form as any} />
                          );
                        case "raft_foundation":
                          return (
                            <ModuleFormRaftFoundation form={form as any} />
                          );
                        case "piles_foundation":
                          return (
                            <ModuleFormPilesFoundation form={form as any} />
                          );
                        case "raft_piles_foundation":
                          return (
                            <ModuleFormRaftPilesFoundation form={form as any} />
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
              (selectedFloors.length === 0 && isUsingPaviments)
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
