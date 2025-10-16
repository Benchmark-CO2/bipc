import { getUnitByUUID } from "@/actions/units/getUnit";
import { patchUnit } from "@/actions/units/patchUnit";
import { postUnit } from "@/actions/units/postUnit";
import {
  UnitFormSchema,
  unitFormSchema,
} from "@/validators/unitForm.validator";
import { convertUnitToFormData } from "@/utils/unitConversions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
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
import { Form } from "../../ui/form";
import UnitFormTower from "./unit-form-tower";

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
      data: {
        floor_groups: [
          {
            name: "",
            area: 100,
            height: 3.0,
            repetition: 1,
            category: "standard_floor",
            index: 1,
          },
        ],
      },
    },
  });

  const {
    isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
  } = useMutation({
    mutationFn: (data: UnitFormSchema) => postUnit(data, projectId),
    onError: (error) => {
      toast.error(t("error.errorCreateUnit"), {
        description:
          error instanceof Error ? error.message : t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      toast.success(t("success.unitCreated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
      setIsOpen(false);
      form.reset();

      if (data.data.unit) {
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
      toast.error(t("error.errorUpdateUnit"), {
        description: error.message || t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.unitUpdated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
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

  useEffect(() => {
    if (unitData) {
      const formData = convertUnitToFormData(unitData);
      form.reset(formData);
    }
  }, [unitData, form]);

  return (
    <Drawer
      direction="right"
      open={isOpen}
      onOpenChange={setIsOpen}
      onClose={handleClose}
      dismissible={false}
    >
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
      <DrawerContent className="min-w-4/5">
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-2xl font-bold text-primary">
            {unitId
              ? t("drawerFormUnit.editTitle")
              : t("drawerFormUnit.addTitle")}
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
                onSubmit={form.handleSubmit(handleSubmit)}
                className="flex flex-col gap-3 overflow-y-auto p-8"
                id="unit-form"
              >
                {form.watch("type") === "tower" && (
                  <UnitFormTower form={form} isEditMode={Boolean(unitId)} />
                )}
              </form>
            </Form>
          )}
        </>
        <DrawerFooter className="px-8">
          {!Boolean(unitId) && (
            <Button
              type="submit"
              variant="bipc"
              className="w-full"
              form="unit-form"
              disabled={isCreationPending || isCreationSuccess}
            >
              {t("drawerFormUnit.addUnitButton")}
              {isCreationPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          )}
          {Boolean(unitId) && (
            <Button
              type="submit"
              variant="bipc"
              className="w-full"
              form="unit-form"
              disabled={isUpdatePending}
            >
              {t("drawerFormUnit.editUnitButton")}
              {isUpdatePending && (
                <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormUnit;
