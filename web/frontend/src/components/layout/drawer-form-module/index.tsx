import { postModule } from "@/actions/modules/postModule";
import { postSimulation } from "@/actions/modules/postSimulation";
import { TModuleStructure } from "@/types/modules";
import {
  ModuleFormSchema,
  moduleFormSchema,
} from "@/validators/moduleFormByType.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
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
import { getDefaultValuesByType } from "./module-default-values";
import { postModuleVersion } from "@/actions/modules/postModuleVersion";

interface DrawerFormModuleProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId: string;
  moduleId?: string;
  moduleData?: TModuleStructure | null;
  structureType: "beam_column" | "concrete_wall" | "structural_masonry";
}

const DrawerFormModule = ({
  triggerComponent,
  projectId,
  unitId,
  moduleId,
  structureType,
  moduleData,
}: DrawerFormModuleProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<ModuleFormSchema>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: getDefaultValuesByType(structureType),
  });

  const { mutate: mutateModuleVersion, isPending: isUpdatePending } =
    useMutation({
      mutationFn: (data: TModuleStructure) =>
        postModuleVersion(data, projectId, unitId, moduleId!),
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
          queryKey: ["module", projectId, unitId, moduleId!],
        });
        form.reset();
        setIsOpen(false);
      },
    });

  const {
    // isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
  } = useMutation({
    mutationFn: (data: TModuleStructure) =>
      !Boolean(moduleId)
        ? postModule(data, projectId, unitId)
        : postSimulation(data, projectId, unitId, moduleId!),
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
      if (moduleId) {
        queryClient.invalidateQueries({
          queryKey: ["modules", projectId, unitId],
        });
      }
      form.reset();
      setIsOpen(false);
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
    if (moduleData) {
      form.reset(moduleData || getDefaultValuesByType(structureType));
    }
  }, [moduleData, moduleId, structureType, form]);

  const handleSubmit = (data: ModuleFormSchema) => {
    if (moduleId) {
      mutateModuleVersion(data as TModuleStructure);
      return;
    }

    const baseFields = {
      name: data.name,
      type: data.type,
      floor_repetition: data.floor_repetition,
      floor_area: data.floor_area,
      floor_height: data.floor_height,
    };

    let filteredData: TModuleStructure = baseFields as TModuleStructure;

    if (baseFields.type === "beam_column") {
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
    } else if (baseFields.type === "concrete_wall") {
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
    } else if (baseFields.type === "structural_masonry") {
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
          form.setValue("type", structureType);
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
                        {t("drawerFormModule.commonForm.structureTypeLabel")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.reset(getDefaultValuesByType(value as any));
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
                const structureType = form.watch("type");

                switch (structureType) {
                  case "beam_column":
                    return <ModuleFormBeamColumn form={form} />;
                  case "concrete_wall":
                    return <ModuleFormConcreteWall form={form} />;
                  case "structural_masonry":
                    return <ModuleFormStructuralMasonry form={form} />;
                  default:
                    return null;
                }
              })()}

              <div className="flex gap-2 mt-6">
                <Button
                  type="submit"
                  variant="bipc"
                  className="flex-1"
                  disabled={isCreationPending || isUpdatePending}
                >
                  {isCreationPending || isUpdatePending ? (
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
