import {
  UnitFormSchema,
  unitFormSchema,
} from "@/validators/unitForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useEffect, useState } from "react";
import UnitFormTower from "./unit-form-tower";
import { postUnit } from "@/actions/units/postUnit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { patchUnit } from "@/actions/units/patchUnit";
import { useTranslation } from "react-i18next";

interface DrawerFormUnitProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
  unitId?: string;
}
const DrawerFormUnit = ({
  triggerComponent,
  projectId,
  unitId,
}: DrawerFormUnitProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<UnitFormSchema>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      type: "tower" as const,
      total_floors: undefined,
      tower_floors: undefined,
      base_floors: undefined,
      basement_floors: undefined,
      type_floors: undefined,
      total_area: undefined,
    },
  });

  const {
    isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
  } = useMutation({
    mutationFn: (data: UnitFormSchema) => postUnit(data, projectId),
    onError: () => {
      toast.error("Erro", {
        description: "Erro ao criar a Unidade de Construção",
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      toast.success("Criado com sucesso", {
        description: "A Unidade de Construção foi criada com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
      setIsOpen(false);
      form.reset();

      if (data.data.unit) {
        navigate({
          to: `/projects/${data.data.unit.project_id}/${data.data.unit.id}`,
          from: "/projects",
        })
          .then(() => null)
          .catch((err: unknown) => err);
      }
    },
  });

  const {
    isSuccess: isUpdateSuccess,
    isPending: isUpdatePending,
    mutate: mutateUpdate,
  } = useMutation({
    mutationFn: (data: UnitFormSchema) => patchUnit(data, projectId, unitId!),
    onError: (error) => {
      toast.error("Algo deu errado ao atualizar Unidade", {
        description: error.message,
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success("Unidade de Construção atualizada", {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      setIsOpen(false);
      form.reset();
    },
  });

  const handleSubmit = (data: UnitFormSchema) => {
    if (unitId) {
      mutateUpdate(data);
      return;
    }
    mutateCreation(data);
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const { data: unitData, isLoading: isLoadingUnitFields } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: async () => {
      if (unitId) {
        const res = await getUnitByUUID(projectId, unitId);
        return res.data.unit;
      }
      return null;
    },
    enabled: !!unitId,
  });

  // Reset form when unit data is loaded
  useEffect(() => {
    if (unitData) {
      form.reset({
        name: unitData.name,
        type: unitData.type,
        total_floors: unitData.total_floors,
        tower_floors: unitData.tower_floors,
        base_floors: unitData.base_floors,
        basement_floors: unitData.basement_floors,
        type_floors: unitData.type_floors,
        total_area: unitData.total_area,
      });
    }
  }, [unitData]);

  const unitTypes = [
    { value: "tower", label: t("drawerFormUnit.unitTypeOptions.tower") },
  ];

  return (
    <Drawer
      direction="right"
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={handleClose}
    >
      <DrawerTrigger asChild>
        {triggerComponent ?? (
          <button className="cursor-pointer rounded-t-lg bg-muted px-4 py-2 hover:bg-accent">
            <Plus />
          </button>
        )}
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <DrawerHeader className="px-6">
          <DrawerTitle>
            {unitId
              ? t("drawerFormUnit.editTitle")
              : t("drawerFormUnit.addTitle")}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          {t("drawerFormUnit.description")}
        </DrawerDescription>
        <div className="mx-auto w-full p-6">
          {isLoadingUnitFields ? (
            <div className="flex h-20 w-full items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="w-full space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerFormUnit.unitNameLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t(
                              "drawerFormUnit.unitNamePlaceholder"
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerFormUnit.unitTypeLabel")}
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={unitTypes.length <= 1}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={t(
                                  "drawerFormUnit.unitTypePlaceholder"
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {unitTypes.map((type) => (
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
                {form.watch("type") === "tower" && (
                  <UnitFormTower form={form} />
                )}
                {unitId ? (
                  <Button
                    disabled={isUpdatePending || isUpdateSuccess}
                    type="submit"
                    variant="noStyles"
                    className="mt-6"
                  >
                    {t("drawerFormUnit.editUnitButton")}
                    {isUpdatePending && (
                      <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="noStyles"
                    className="mt-6 w-full"
                    disabled={isCreationPending || isCreationSuccess}
                  >
                    {t("drawerFormUnit.addUnitButton")}
                    {isCreationPending && (
                      <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                    )}
                  </Button>
                )}
              </form>
            </Form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormUnit;
