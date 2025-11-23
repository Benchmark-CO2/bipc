/* eslint-disable @typescript-eslint/no-misused-promises */
import { getSignedUrl } from "@/actions/files/getSigneedUrl";
import { postFile } from "@/actions/files/postFile";
import { patchProject } from "@/actions/projects/patchProject";
import {
  postProject,
  PostProjectRequest,
} from "@/actions/projects/postProject";
import { useIsMobile } from "@/hooks/useIsMobile";
import useCep from "@/hooks/useLocation";
import { cn } from "@/lib/utils";
import { IProject } from "@/types/projects";
import { masks } from "@/utils/masks";
import {
  ProjectFormSchema,
  projectFormSchema,
} from "@/validators/projectForm.validador";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
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

interface IDrawerAddProject {
  componentTrigger: React.ReactNode;
  projectData?: IProject;
}

export default function DrawerFormProject({
  componentTrigger,
  projectData,
}: IDrawerAddProject) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);

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
      phase: projectData?.phase || "not_defined",
      street: projectData?.street || "",
      number: projectData?.number || "",
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
          to: `/new_projects/${data.data.project.id}`,
          from: "/new_projects",
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
      queryClient.invalidateQueries({
        queryKey: ["project", projectData!.id],
      });
      setOpenDrawer(false);
      form.reset();
    },
  });

  const { data: signedUrlData } = useQuery({
    queryKey: ["projects", "signed_url"],
    queryFn: () => getSignedUrl(file?.name!),
    enabled: !!file,
    staleTime: 1000 * 60 * 15,
  });

  const uploadImage = async () => {
    if (!file || !signedUrlData) return;

    const fileParams = new FormData();
    Object.keys(signedUrlData.data.form_data).forEach((key) => {
      fileParams.append(key, signedUrlData.data.form_data[key]);
    });
    fileParams.append("file", file);

    const imageUrl = signedUrlData.data.public_url;
    try {
      await postFile(signedUrlData.data.url, fileParams);
    } catch (error) {
      toast.error(t("error.errorUnknown"), {
        description: (error as Error).message,
        duration: 5000,
      });
      return;
    }
    return imageUrl;
  };
  const onSubmit = async (data: ProjectFormSchema) => {
    let imageUrl: string | undefined = undefined;
    const copyData: Partial<PostProjectRequest> = {
      name: data.name,
      description: data.description,
      state: data.state,
      city: data.city,
      neighborhood: data.neighborhood || "",
      cep: data.cep || "",
      phase: data.phase,
      street: data.street || "",
      number: data.number || "",
      image_url: undefined,
    };

    // Remove empty optional fields
    if (!copyData.neighborhood) delete copyData.neighborhood;
    if (!copyData.cep) delete copyData.cep;
    if (!copyData.street) delete copyData.street;
    if (!copyData.number) delete copyData.number;
    if (!copyData.description) delete copyData.description;

    if (file) {
      imageUrl = await uploadImage();
    }

    if (isEditMode) {
      if (imageUrl) {
        copyData.image_url = imageUrl;
      } else {
        delete copyData.image_url;
      }
      mutateUpdate(copyData as ProjectFormSchema);
      return;
    }

    if (imageUrl) {
      copyData.image_url = imageUrl;
    } else {
      delete copyData.image_url;
    }
    mutateCreation(copyData as PostProjectRequest);
  };

  const handleChangeImage = async (file: File) => {
    setFile(file);
  };

  useEffect(() => {
    if (openDrawer) {
      resetCreation();
      resetUpdate();
      setIsAgreementChecked(false);

      if (projectData) {
        form.reset({
          name: projectData.name || "",
          description: projectData.description || "",
          state: projectData.state || "",
          city: projectData.city || "",
          neighborhood: projectData.neighborhood || "",
          cep: projectData.cep || "",
          phase: projectData.phase || "not_defined",
          street: projectData.street || "",
          number: projectData.number || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          state: "",
          city: "",
          neighborhood: "",
          cep: "",
          phase: "not_defined",
          street: "",
          number: "",
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

  const isMobile = useIsMobile();
  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={openDrawer}
      dismissible={false}
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
      <DrawerContent
        className={cn("min-w-2/5", {
          "w-full h-4/5": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle>
            {isEditMode
              ? t("drawerFormProject.editTitle")
              : t("drawerFormProject.addTitle")}
          </DrawerTitle>
          <Button
            onClick={() => setOpenDrawer(false)}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <Form {...form}>
          <div className="max-h-[calc(100vh-100px)] overflow-y-auto px-8">
            <form
              id="project-form"
              className="flex flex-col gap-3 rounded-md px-4 py-2 border-gray-shade-200 border bg-card"
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
                          disabled={locationLoading}
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
                          disabled={locationLoading}
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
                        disabled={locationLoading}
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
                          disabled={locationLoading}
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
                          <SelectItem value="not_defined">
                            {t("common.projectPhaseOptions.not_defined")}
                          </SelectItem>
                          <SelectItem value="preliminary_study">
                            {t("common.projectPhaseOptions.preliminary_study")}
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

              <div className="p-5 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
                <div className="flex items-start gap-3 mb-4">
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
                      Importante: Confirmação de Dados
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                      Os responsáveis pelos projetos poderão ser contactados em
                      até <strong>3 anos após o fim da fase do projeto</strong>{" "}
                      indicada no momento de criação do projeto. Este contato
                      busca confirmar a execução dos dados informados no momento
                      do projeto. A confiabilidade do nosso benchmark depende da
                      sua colaboração. Agradecemos a compreensão!
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-md border border-yellow-300 dark:border-yellow-700">
                  <input
                    type="checkbox"
                    id="agreement-checkbox"
                    checked={isAgreementChecked}
                    onChange={(e) => setIsAgreementChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500 cursor-pointer flex-shrink-0"
                  />
                  <label
                    htmlFor="agreement-checkbox"
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer select-none leading-relaxed"
                  >
                    Estou ciente da possibilidade de ser contactado para
                    confirmação dos dados do projeto, conforme informado
                  </label>
                </div>
              </div>
            </form>
          </div>
        </Form>
        <DrawerFooter className="px-8 py-4">
          {isEditMode ? (
            <Button
              disabled={isUpdatePending || isUpdateSuccess}
              type="submit"
              form="project-form"
              variant={"bipc"}
            >
              {t("drawerFormProject.editProjectButton")}
              {isUpdatePending && (
                <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          ) : (
            <Button
              variant={"bipc"}
              disabled={
                isCreationPending || isCreationSuccess || !isAgreementChecked
              }
              type="submit"
              form="project-form"
            >
              {t("drawerFormProject.addProjectButton")}
              {isCreationPending && (
                <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
