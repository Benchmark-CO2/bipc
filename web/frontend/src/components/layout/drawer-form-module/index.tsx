import { postModule } from "@/actions/modules/postModule";
import { TModuleStructure } from "@/types/modules";
import { mockModules } from "@/utils/mockModules";
import {
  ModuleFormSchema,
  moduleFormSchema,
} from "@/validators/moduleForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import ModuleFormStructuralMasonry from "./module-form-structural-masonry";

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId: string;
  moduleId?: string;
  structureType?: "beam_column" | "concrete_wall" | "structural_masonry";
}

const DrawerFormModule = ({
  triggerComponent,
  projectId,
  unitId,
  moduleId,
  structureType,
}: DrawerFormModuleProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<ModuleFormSchema>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      name: "",
      floor_repetition: 1,
      floor_area: 0,
      floor_height: 0,
      structure_type: "concrete_wall",
      // Beam Column
      concrete_columns: [],
      concrete_beams: [],
      concrete_slabs: [],
      steel_ca50: 0,
      steel_ca60: 0,
      form_columns: 0,
      form_beams: 0,
      form_slabs: 0,
      form_total: 0,
      column_number: 0,
      avg_beam_span: 0,
      avg_slab_span: 0,
      // Concrete Wall
      concrete_walls: [],
      wall_thickness: 0,
      slab_thickness: 0,
      form_area: 0,
      wall_area: 0,
      // Structural Masonry
      vertical_grout: [],
      horizontal_grout: [],
      blocks: [],
    },
  });

  const moduleData = mockModules as unknown as TModuleStructure;

  const {
    // isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
  } = useMutation({
    mutationFn: (data: TModuleStructure) => postModule(data, projectId, unitId),
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
      form.reset();
      setIsOpen(false);

      // navigate({
      //   to: `/projects/${projectId}/${unitId}`,
      //   from: "/projects",
      // })
      //   .then(() => null)
      //   .catch((err: unknown) => err);
    },
  });

  useEffect(() => {
    const ensureArraysInitialized = () => {
      const fieldsToInit = [
        "concrete_columns",
        "concrete_beams",
        "concrete_slabs",
        "concrete_walls",
        "vertical_grout",
        "horizontal_grout",
        "blocks",
      ] as const;

      fieldsToInit.forEach((field) => {
        if (!Array.isArray(form.getValues(field))) {
          form.setValue(field, []);
        }
      });
    };

    ensureArraysInitialized();
  }, [form]);

  useEffect(() => {
    if (moduleData && moduleId) {
      form.reset(moduleData);
    }
  }, [moduleData, moduleId]);

  // Reset structure-specific fields when structure_type changes
  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (name === "structure_type" && !moduleId) {
        // Reset all structure-specific fields to default values
        const resetFields = {
          // Beam Column fields
          concrete_columns: [],
          concrete_beams: [],
          concrete_slabs: [],
          steel_ca50: 0,
          steel_ca60: 0,
          form_columns: 0,
          form_beams: 0,
          form_slabs: 0,
          form_total: 0,
          column_number: 0,
          avg_beam_span: 0,
          avg_slab_span: 0,
          // Concrete Wall fields
          concrete_walls: [],
          wall_thickness: 0,
          slab_thickness: 0,
          form_area: 0,
          wall_area: 0,
          // Structural Masonry fields
          vertical_grout: [],
          horizontal_grout: [],
          blocks: [],
        };

        // Apply reset only for structure-specific fields
        Object.entries(resetFields).forEach(([fieldName, defaultValue]) => {
          form.setValue(fieldName as keyof ModuleFormSchema, defaultValue);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, moduleId]);

  const handleSubmit = (data: ModuleFormSchema) => {
    if (moduleId) {
      return;
    }

    const baseFields = {
      name: data.name,
      structure_type: data.structure_type,
      floor_repetition: data.floor_repetition,
      floor_area: data.floor_area,
      floor_height: data.floor_height,
    };

    let filteredData: TModuleStructure = baseFields as TModuleStructure;

    if (data.structure_type === "beam_column") {
      filteredData = {
        ...baseFields,
        concrete_columns: data.concrete_columns || [],
        concrete_beams: data.concrete_beams || [],
        concrete_slabs: data.concrete_slabs || [],
        steel_ca50: data.steel_ca50 || 0,
        steel_ca60: data.steel_ca60 || 0,
        form_columns: data.form_columns,
        form_beams: data.form_beams,
        form_slabs: data.form_slabs,
        form_total: data.form_total,
        column_number: data.column_number,
        avg_beam_span: data.avg_beam_span,
        avg_slab_span: data.avg_slab_span,
      };
    } else if (data.structure_type === "concrete_wall") {
      filteredData = {
        ...baseFields,
        concrete_walls: data.concrete_walls || [],
        concrete_slabs: data.concrete_slabs || [],
        steel_ca50: data.steel_ca50 || 0,
        steel_ca60: data.steel_ca60 || 0,
        wall_thickness: data.wall_thickness,
        slab_thickness: data.slab_thickness,
        form_area: data.form_area,
        wall_area: data.wall_area,
      };
    } else if (data.structure_type === "structural_masonry") {
      filteredData = {
        ...baseFields,
        vertical_grout: data.vertical_grout || [],
        horizontal_grout: data.horizontal_grout || [],
        steel_ca50: data.steel_ca50 || 0,
        steel_ca60: data.steel_ca60 || 0,
        blocks: data.blocks || [],
      };
    }

    mutateCreation(filteredData);
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

  return (
    <Drawer
      direction="right"
      open={isOpen}
      dismissible={false}
      onOpenChange={() => {
        setIsOpen(true);
        if (structureType) {
          form.setValue("structure_type", structureType);
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
      <DrawerContent className="min-w-3/5">
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
        <div className="mx-auto w-full p-6 overflow-auto h-[calc(100vh-78px)]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full space-y-6"
            >
              {/* Campos básicos */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
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
                  name="structure_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerFormModule.commonForm.structureTypeLabel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
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
                              <SelectItem key={type.value} value={type.value}>
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

              {/* Campos de andar */}
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
              </div>

              {/* Campos específicos por tipo de estrutura */}
              {(() => {
                const structureType = form.watch("structure_type");

                switch (structureType) {
                  case "beam_column":
                    return <ModuleFormBeamColumn form={form} />;
                  case "concrete_wall":
                    // return <span>concrete</span>;
                    return <ModuleFormConcreteWall form={form} />;
                  case "structural_masonry":
                    // return <span>masonry</span>;
                    return <ModuleFormStructuralMasonry form={form} />;
                  default:
                    return null;
                }
              })()}

              <div className="flex gap-2 mt-6">
                {moduleId && moduleData && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => console.log("Delete module", moduleId)}
                    className="flex-shrink-0"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="noStyles"
                  className="flex-1"
                  disabled={isCreationPending}
                >
                  {isCreationPending ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : moduleId ? (
                    t("common.update")
                  ) : (
                    t("common.add")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
