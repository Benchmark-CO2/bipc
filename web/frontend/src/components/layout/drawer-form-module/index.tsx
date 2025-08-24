// import { postModule } from "@/actions/modules/postModule"; // comentado temporariamente
import { TModuleStructure, TModulesTypes } from "@/types/modules";
import {
  ModuleFormSchema,
  moduleFormSchema,
} from "@/validators/moduleFormByType.validator";
import { zodResolver } from "@hookform/resolvers/zod";
// import { useMutation, useQueryClient } from "@tanstack/react-query"; // comentado temporariamente
import { /*Loader2,*/ Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
// import { toast } from "sonner"; // comentado temporariamente
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import ModuleFormBeamColumn from "./module-form-beam-column";
import ModuleFormConcreteWall from "./module-form-concrete-wall";
// import ModuleFormStructuralMasonry from "./module-form-structural-masonry"; // comentado por enquanto
import { getDefaultValuesByType } from "./module-default-values";
import BuildingVisualizer from "../building-visualizer";
import { mockUnit } from "@/utils/mockUnit";
// import { postModuleVersion } from "@/actions/modules/postModuleVersion"; // comentado temporariamente

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  // projectId: string; // comentado temporariamente
  // unitId: string; // comentado temporariamente
  moduleId?: string;
  moduleData?: TModuleStructure | null;
  type: TModulesTypes;
}

const DrawerFormModule = ({
  triggerComponent,
  // projectId, // comentado temporariamente
  // unitId, // comentado temporariamente
  moduleId,
  type,
  moduleData,
}: DrawerFormModuleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);

  const floors = mockUnit.floors;
  const { t } = useTranslation();
  // const queryClient = useQueryClient(); // comentado temporariamente

  const form = useForm<ModuleFormSchema>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: getDefaultValuesByType(type),
  });

  // Comentado: mutations para evitar conflitos de tipo durante a transição
  // const { mutate: mutateModuleVersion, isPending: isUpdatePending } =
  //   useMutation({
  //     mutationFn: (data: TModuleStructure) =>
  //       postModuleVersion(data, projectId, unitId, moduleId!),
  //     onError: (error) => {
  //       toast.error(t("error.errorUpdateModule"), {
  //         description:
  //           error instanceof Error ? error.message : t("error.errorUnknown"),
  //         duration: 5000,
  //       });
  //     },
  //     onSuccess: () => {
  //       toast.success(t("success.moduleUpdated"), {
  //         duration: 5000,
  //       });
  //       queryClient.invalidateQueries({
  //         queryKey: ["project", projectId],
  //       });
  //       queryClient.invalidateQueries({
  //         queryKey: ["unit", projectId, unitId],
  //       });
  //       queryClient.invalidateQueries({
  //         queryKey: ["module", projectId, unitId, moduleId!],
  //       });
  //       form.reset();
  //       setIsOpen(false);
  //     },
  //   });

  // const {
  //   // isSuccess: isCreationSuccess,
  //   isPending: isCreationPending,
  //   mutate: mutateCreation,
  // } = useMutation({
  //   mutationFn: (data: TModuleStructure) => postModule(data, projectId, unitId),
  //   onError: (error) => {
  //     toast.error(t("error.errorCreateModule"), {
  //       description:
  //         error instanceof Error ? error.message : t("error.errorUnknown"),
  //       duration: 5000,
  //     });
  //   },
  //   onSuccess: () => {
  //     toast.success(t("success.moduleCreated"), {
  //       duration: 5000,
  //     });
  //     queryClient.invalidateQueries({
  //       queryKey: ["project", projectId],
  //     });
  //     queryClient.invalidateQueries({
  //       queryKey: ["unit", projectId, unitId],
  //     });
  //     if (moduleId) {
  //       queryClient.invalidateQueries({
  //         queryKey: ["modules", projectId, unitId],
  //       });
  //     }
  //     form.reset();
  //     setIsOpen(false);
  //   },
  // });

  useEffect(() => {
    const ensureArraysInitialized = () => {
      const fieldsToInit = [
        "concreteColumns",
        "concreteBeams",
        "concreteSlabs",
        "concreteWalls",
        // "vertical_grout", // comentado: structural masonry
        // "horizontal_grout", // comentado: structural masonry
        // "blocks", // comentado: structural masonry
      ] as const;

      fieldsToInit.forEach((field) => {
        if (!form.getValues(field)) {
          form.setValue(field, { volumes: [], steel: [] });
        }
      });
    };

    ensureArraysInitialized();
  }, [form]);

  useEffect(() => {
    if (moduleData) {
      // Comentado temporariamente devido a incompatibilidade de tipos
      // form.reset(moduleData || getDefaultValuesByType(type));
      console.log("Module data:", moduleData);
    }
  }, [moduleData, moduleId, type, form]);

  const handleSubmit = (data: ModuleFormSchema) => {
    if (moduleId) {
      const completeData = {
        ...data,
        name: data.name || form.getValues("name") || moduleData?.name,
        type: data.type || form.getValues("type") || moduleData?.type,
      };
      console.log("Update data:", completeData);
      // mutateModuleVersion(completeData as TModuleStructure);
      return;
    }

    const baseFields = {
      name: data.name,
      type: data.type,
    };

    let filteredData: any = baseFields; // Changed to any to avoid type conflicts for now

    if (baseFields.type === "beam_column") {
      filteredData = {
        ...baseFields,
        concreteColumns: data.concreteColumns || { volumes: [], steel: [] },
        concreteBeams: data.concreteBeams || { volumes: [], steel: [] },
        concreteSlabs: data.concreteSlabs || { volumes: [], steel: [] },
        formColumns: data.formColumns,
        formBeams: data.formBeams,
        formSlabs: data.formSlabs,
        columnNumber: data.columnNumber,
        avgBeamSpan: data.avgBeamSpan,
        avgSlabSpan: data.avgSlabSpan,
      };
    } else if (baseFields.type === "concrete_wall") {
      filteredData = {
        ...baseFields,
        concreteWalls: data.concreteWalls || { volumes: [], steel: [] },
        concreteSlabs: data.concreteSlabs || { volumes: [], steel: [] },
        wallThickness: data.wallThickness,
        slabThickness: data.slabThickness,
        formArea: data.formArea,
        wallArea: data.wallArea,
      };
    }
    // Comentado: structural masonry
    // else if (baseFields.type === "structural_masonry") {
    //   filteredData = {
    //     ...baseFields,
    //     vertical_grout: data.vertical_grout || [],
    //     horizontal_grout: data.horizontal_grout || [],
    //     blocks: data.blocks || [],
    //   };
    // }

    console.log("Create data:", filteredData);
    // mutateCreation(filteredData);
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const structureTypes = [
    { value: "beam_column", label: t("common.structureType.beamColumn") },
    { value: "concrete_wall", label: t("common.structureType.concreteWall") },
    // { value: "structural_masonry", label: t("common.structureType.masonry") }, // comentado por enquanto
  ];

  return (
    <Drawer
      direction="right"
      open={isOpen}
      dismissible={false}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
          if (type && (type === "beam_column" || type === "concrete_wall")) {
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
      <DrawerContent className="min-w-4/6">
        <DrawerHeader className="px-8">
          <DrawerTitle>
            {moduleId
              ? t("drawerFormModule.editTitle")
              : t("drawerFormModule.addTitle")}
          </DrawerTitle>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          {t("drawerFormModule.description")}
        </DrawerDescription>
        <div className="mx-auto w-full p-6 h-[calc(100vh-78px)] flex">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full flex gap-6 h-full"
            >
              <div className="flex-shrink-0 h-full overflow-y-auto">
                <div className="sticky top-0">
                  <BuildingVisualizer
                    key={`building-${floors?.length || 0}-${JSON.stringify(floors?.map((f) => ({ color: f.color, repetition: f.repetition_number, underground: f.underground })))}`}
                    floors={floors || []}
                    isSelectable={true}
                    selectedFloors={selectedFloors}
                    onCheckFloor={setSelectedFloors}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="p-4 border rounded-lg border-muted space-y-4">
                  {/* Campos básicos */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      disabled={Boolean(moduleId)}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("drawerFormModule.commonForm.nameLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t(
                                "drawerFormModule.commonForm.namePlaceholder"
                              )}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
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
                                  value === "concrete_wall"
                                ) {
                                  form.reset(
                                    getDefaultValuesByType(value as any)
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

                  {/* Campos de andar
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="floor_repetition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerFormModule.commonForm.floorRepetitionLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="floor_area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerFormModule.commonForm.floorAreaLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="floor_height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerFormModule.commonForm.floorHeightLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div> */}

                  {/* Campos específicos por tipo de estrutura */}
                  {(() => {
                    const structureType = form.watch("type");

                    switch (structureType) {
                      case "beam_column":
                        return <ModuleFormBeamColumn form={form as any} />;
                      case "concrete_wall":
                        return <ModuleFormConcreteWall form={form as any} />;
                      // case "structural_masonry": // comentado por enquanto
                      //   return <ModuleFormStructuralMasonry form={form} />;
                      default:
                        return null;
                    }
                  })()}

                  <div className="flex gap-2 mt-6">
                    <Button
                      type="submit"
                      variant="bipc"
                      className="flex-1"
                      // disabled={isCreationPending || isUpdatePending} // comentado
                    >
                      {/* {isCreationPending || isUpdatePending ? ( // comentado
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : moduleId ? (
                      t("common.update")
                    ) : (
                      t("common.add")
                    )} */}
                      {moduleId ? t("common.update") : t("common.add")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
