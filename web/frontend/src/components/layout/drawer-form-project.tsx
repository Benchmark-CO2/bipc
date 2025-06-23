/* eslint-disable @typescript-eslint/no-misused-promises */
import { postProject } from "@/actions/projects/postProject";
import { patchProject } from "@/actions/projects/patchProject";
import { IProject } from "@/types/projects";
import useCep from "@/hooks/useLocation";
import { masks } from "@/utils/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
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
import { Textarea } from "../ui/textarea";
import {
  ProjectFormSchema,
  projectFormSchema,
} from "@/validators/projectForm.validador";

interface IDrawerAddProject {
  componentTrigger: React.ReactNode;
  projectData?: IProject;
}

export default function DrawerFormProject({
  componentTrigger,
  projectData,
}: IDrawerAddProject) {
  const [openDrawer, setOpenDrawer] = useState(false);

  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditMode = !!projectData;

  const form = useForm<ProjectFormSchema>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: projectData?.name || "",
      description: projectData?.description || "",
      state: projectData?.state || "",
      city: projectData?.city || "",
      neighborhood: projectData?.neighborhood || "",
      cep: projectData?.cep || "",
      phase: projectData?.phase || "preliminary_study",
      street: projectData?.street || "",
      number: projectData?.number || "",
      image_url: undefined,
    },
  });

  const {
    data: locationData,
    isError,
    isLoading: locationLoading,
    searchCep,
  } = useCep();

  const navigate = useNavigate();

  const {
    isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
    reset: resetCreation,
  } = useMutation({
    mutationFn: postProject,
    onError: (error) => {
      toast.error(t("error.errorCreateProject"), {
        description: error.message,
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      toast.success(t("success.projectCreated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      setOpenDrawer(false);
      form.reset();

      if (data.data.project?.id) {
        navigate({
          to: `/projects/${data.data.project.id}`,
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
    reset: resetUpdate,
  } = useMutation({
    mutationFn: (data: ProjectFormSchema) =>
      patchProject(data as any, projectData!.id),
    onError: (error) => {
      toast.error(t("error.errorEditProject"), {
        description: error.message,
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.projectUpdated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      setOpenDrawer(false);
      form.reset();
    },
  });

  const onSubmit = (data: ProjectFormSchema) => {
    if (isEditMode) {
      mutateUpdate(data);
      return;
    }
    mutateCreation(data);
  };

  useEffect(() => {
    if (openDrawer) {
      resetCreation();
      resetUpdate();

      if (projectData) {
        form.reset({
          name: projectData.name || "",
          description: projectData.description || "",
          state: projectData.state || "",
          city: projectData.city || "",
          neighborhood: projectData.neighborhood || "",
          cep: projectData.cep || "",
          phase: projectData.phase || "preliminary_study",
          street: projectData.street || "",
          number: projectData.number || "",
          image_url: undefined,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          state: "",
          city: "",
          neighborhood: "",
          cep: "",
          phase: "preliminary_study",
          street: "",
          number: "",
          image_url: undefined,
        });
      }
    }
  }, [projectData, openDrawer, form, resetCreation, resetUpdate]);

  useEffect(() => {
    if (locationData) {
      form.clearErrors("cep");
      form.setValue("state", locationData.state);
      form.setValue("city", locationData.city);
      form.setValue("neighborhood", locationData.neighborhood);
      form.setValue("street", locationData.street);
    }
  }, [locationData, form]);

  useEffect(() => {
    if (isError) {
      toast.error(t("error.errorFetchZipCode"), {
        description: t("warn.verifyZipCode"),
        duration: 5000,
      });
      form.setError("cep", {
        type: "manual",
        message: t("warn.verifyZipCode"),
      });
      form.setValue("state", "");
      form.setValue("city", "");
    }
  }, [isError, form]);

  return (
    <Drawer
      direction="right"
      onClose={() => setOpenDrawer(false)}
      open={openDrawer}
    >
      <DrawerTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
          setOpenDrawer(true);
        }}
      >
        {componentTrigger}
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5 px-6">
        <div className="mx-auto w-11/12">
          <DrawerHeader>
            <DrawerTitle>
              {isEditMode
                ? t("drawerFormProject.editTitle")
                : t("drawerFormProject.addTitle")}
            </DrawerTitle>
          </DrawerHeader>
          <Form {...form}>
            <form
              className="flex w-full flex-col gap-3 p-4 max-sm:w-sm"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerFormProject.projectNameLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          "drawerFormProject.projectNamePlaceholder"
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
                name="cep"
                render={({ field }) => (
                  <FormItem className="flex-1/3">
                    <FormLabel>{t("drawerFormProject.cepLabel")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={t("drawerFormProject.cepPlaceholder")}
                          value={masks.cep((field.value as string) || "")}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            if (e.target.value.length > 8)
                              searchCep(e.target.value);
                          }}
                        />
                        {locationLoading && (
                          <div className="h-4 w-4 animate-spin rounded-full border-1 border-primary border-t-transparent" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex w-full gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="flex-1/3">
                      <FormLabel>{t("drawerFormProject.stateLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("drawerFormProject.statePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="flex-2/3">
                      <FormLabel>{t("drawerFormProject.cityLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("drawerFormProject.cityPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem className="flex-2/3">
                    <FormLabel>
                      {t("drawerFormProject.neighborhoodLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          "drawerFormProject.neighborhoodPlaceholder"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex w-full gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="flex-2/3">
                      <FormLabel>
                        {t("drawerFormProject.streetLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("drawerFormProject.streetPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem className="flex-1/3">
                      <FormLabel>
                        {t("drawerFormProject.numberLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("drawerFormProject.numberPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerFormProject.projectPhaseLabel")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        defaultValue=""
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "drawerFormProject.projectPhasePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preliminary_study">
                            {t("common.projectPhaseOptions.preliminary_study")}
                          </SelectItem>
                          <SelectItem value="draft">
                            {t("common.projectPhaseOptions.draft")}
                          </SelectItem>
                          <SelectItem value="basic_project">
                            {t("common.projectPhaseOptions.basic_project")}
                          </SelectItem>
                          <SelectItem value="executive_project">
                            {t("common.projectPhaseOptions.executive_project")}
                          </SelectItem>
                          <SelectItem value="released_for_construction">
                            {t(
                              "common.projectPhaseOptions.released_for_construction"
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerFormProject.descriptionLabel")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          "drawerFormProject.descriptionPlaceholder"
                        )}
                        minLength={10}
                        maxLength={200}
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image_url"
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>{t("drawerFormProject.imageLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("drawerFormProject.imagePlaceholder")}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onChange(file);
                        }}
                        {...rest}
                        value={undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEditMode ? (
                <Button
                  disabled={isUpdatePending || isUpdateSuccess}
                  type="submit"
                  variant="noStyles"
                  className="mt-6"
                >
                  {t("drawerFormProject.editProjectButton")}
                  {isUpdatePending && (
                    <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                  )}
                </Button>
              ) : (
                <Button
                  disabled={isCreationPending || isCreationSuccess}
                  type="submit"
                  variant="noStyles"
                  className="mt-6"
                >
                  {t("drawerFormProject.addProjectButton")}
                  {isCreationPending && (
                    <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                  )}
                </Button>
              )}
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
