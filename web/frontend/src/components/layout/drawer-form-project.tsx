import { getSignedUrl } from "@/actions/files/getSigneedUrl";
import { postFile } from "@/actions/files/postFile";
import { patchProject } from "@/actions/projects/patchProject";
import {
  postProject,
  PostProjectRequest,
} from "@/actions/projects/postProject";
import { postDiscipline } from "@/actions/disciplines/postDiscipline";
import { useIsMobile } from "@/hooks/useIsMobile";
import useCep from "@/hooks/useLocation";
import useCities from "@/hooks/useCities";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { IProject } from "@/types/projects";
import { masks } from "@/utils/masks";
import { states } from "@/utils/states";
import {
  ProjectFormSchema,
  createProjectFormSchema,
} from "@/validators/projectForm.validador";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
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
import { CityCombobox } from "../ui/city-combobox";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";

interface IDrawerAddProject {
  componentTrigger: React.ReactNode;
  projectData?: IProject;
}

interface CreateProjectWithStructure {
  project: PostProjectRequest;
  autoCreateStructure: boolean;
  currentUserId: string;
  structurePayload: {
    name: string;
    description: string;
  };
  onStructureError: (error: unknown) => void;
  onStructureSuccess: () => void;
}

const buildStructurePermissions = (): number[] => {
  const managementIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return managementIds;
};

const createProjectAndStructure = async (
  payload: CreateProjectWithStructure,
) => {
  const projectResponse = await postProject(payload.project);
  const projectId = projectResponse.data.project?.id;
  if (projectId && payload.autoCreateStructure) {
    try {
      await postDiscipline(projectId, {
        name: payload.structurePayload.name,
        description: payload.structurePayload.description,
        simulation: true,
        permissions_ids: buildStructurePermissions(),
        users_ids: [payload.currentUserId],
      });
      payload.onStructureSuccess();
    } catch (err) {
      payload.onStructureError(err);
    }
  }
  return projectResponse;
};

export default function DrawerFormProject({
  componentTrigger,
  projectData,
}: IDrawerAddProject) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [file] = useState<File | undefined>(undefined);
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);
  const [autoCreateStructure, setAutoCreateStructure] = useState(true);
  const [filledByCep, setFilledByCep] = useState(false);
  const [cepFilledFields, setCepFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [selectedState, setSelectedState] = useState("");
  const { t } = useTranslation();
  const { user } = useAuth();

  const queryClient = useQueryClient();
  const isEditMode = !!projectData;

  const form = useForm<ProjectFormSchema>({
    resolver: zodResolver(createProjectFormSchema(t)),
    defaultValues: {
      name: projectData?.name || "",
      siop: projectData?.siop || "",
      apf: projectData?.apf || "",
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

  const {
    cities,
    isLoading: citiesLoading,
    isError: citiesError,
  } = useCities(selectedState);

  const navigate = useNavigate();

  const {
    isSuccess: isCreationSuccess,
    isPending: isCreationPending,
    mutate: mutateCreation,
    reset: resetCreation,
  } = useMutation({
    mutationFn: createProjectAndStructure,
    onError: (error) => {
      toast.error(t.projects.form.createError, {
        description: parseApiError(error, t),
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      toast.success(t.projects.form.createSuccess, {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      const projectId = data.data.project?.id;
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project-collaborators", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["project-permissions", projectId],
        });
      }
      setOpenDrawer(false);
      form.reset();
      setAutoCreateStructure(true);

      if (projectId) {
        navigate({
          to: `/new_projects/${projectId}`,
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
      toast.error(t.projects.form.editError, {
        description: parseApiError(error, t),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t.projects.form.editSuccess, {
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
      toast.error(t.projects.form.unknownError, {
        description: parseApiError(error, t),
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
      siop: data.siop || "",
      apf: data.apf || "",
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
    if (!copyData.siop) delete copyData.siop;
    if (!copyData.apf) delete copyData.apf;

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
    mutateCreation({
      project: copyData as PostProjectRequest,
      autoCreateStructure: autoCreateStructure && !!user?.id,
      currentUserId: user?.id || "",
      structurePayload: {
        name: t.projects.form.autoCreateStructureDisciplineName,
        description: t.projects.form.autoCreateStructureDisciplineDescription,
      },
      onStructureSuccess: () => {
        toast.success(t.disciplines.createSuccess, {
          duration: 5000,
        });
      },
      onStructureError: (err) => {
        toast.error(t.disciplines.createError, {
          description: parseApiError(err, t),
          duration: 5000,
        });
      },
    });
  };

  useEffect(() => {
    if (openDrawer) {
      resetCreation();
      resetUpdate();
      setIsAgreementChecked(false);
      setAutoCreateStructure(true);
      setFilledByCep(false);
      setCepFilledFields(new Set());
      setSelectedState("");

      if (projectData) {
        form.reset({
          name: projectData.name || "",
          siop: projectData.siop || "",
          apf: projectData.apf || "",
          description: projectData.description || "",
          state: projectData.state || "",
          city: projectData.city || "",
          neighborhood: projectData.neighborhood || "",
          cep: projectData.cep || "",
          phase: projectData.phase || "not_defined",
          street: projectData.street || "",
          number: projectData.number || "",
        });
        setIsAgreementChecked(true);
      } else {
        form.reset({
          name: "",
          siop: "",
          apf: "",
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
      setFilledByCep(true);
      setSelectedState(locationData.state);
      form.clearErrors("cep");

      const filled = new Set<string>();
      if (locationData.state) filled.add("state");
      if (locationData.city) filled.add("city");
      if (locationData.neighborhood) filled.add("neighborhood");
      if (locationData.street) filled.add("street");
      setCepFilledFields(filled);

      form.setValue("state", locationData.state ?? "");
      form.setValue("city", locationData.city ?? "");
      form.setValue("neighborhood", locationData.neighborhood ?? "");
      form.setValue("street", locationData.street ?? "");
    }
  }, [locationData, form]);

  useEffect(() => {
    if (isError) {
      setFilledByCep(false);
      setCepFilledFields(new Set());
      setSelectedState("");
      toast.error(t.cep.fetchError, {
        description: t.cep.verifyMessage,
        duration: 5000,
      });
      form.setError("cep", {
        type: "manual",
        message: t.cep.verifyMessage,
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
            {isEditMode ? t.projects.form.editTitle : t.projects.form.addTitle}
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
          <div className="@container max-h-[calc(100vh-100px)] overflow-y-auto px-8">
            <form
              id="project-form"
              className="flex flex-col gap-3 rounded-md px-4 py-2 border-gray-shade-200 border bg-card"
              onSubmit={form.handleSubmit(onSubmit)}
              autoComplete="off"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.projects.form.projectName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.projects.form.projectName}
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
                    <FormLabel>{t.projects.form.cep}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={t.projects.form.cepPlaceholder}
                          value={masks.cep((field.value as string) || "")}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            field.onChange(e.target.value);
                            if (raw.length === 0 && filledByCep) {
                              setFilledByCep(false);
                              setCepFilledFields(new Set());
                              setSelectedState("");
                              form.setValue("state", "");
                              form.setValue("city", "");
                              form.setValue("neighborhood", "");
                              form.setValue("street", "");
                            }
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
              <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.projects.form.state}</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedState(value);
                            if (!filledByCep) {
                              form.setValue("city", "");
                            }
                          }}
                          value={field.value}
                          disabled={filledByCep || locationLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t.projects.form.state} />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem
                                key={state.label}
                                value={state.value.toUpperCase()}
                              >
                                {state.label} - {state.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="@md:col-span-2">
                      <FormLabel>{t.projects.form.city}</FormLabel>
                      <FormControl>
                        {filledByCep ? (
                          <Input
                            placeholder={t.projects.form.cityPlaceholder}
                            disabled
                            {...field}
                          />
                        ) : (
                          <CityCombobox
                            cities={cities}
                            value={field.value}
                            onChange={field.onChange}
                            disabled={!selectedState || locationLoading}
                            isLoading={citiesLoading}
                            isError={citiesError}
                            placeholder={
                              !selectedState
                                ? t.projects.form.selectStateFirst
                                : t.projects.form.cityPlaceholder
                            }
                          />
                        )}
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
                  <FormItem>
                    <FormLabel>{t.projects.form.neighborhood}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.projects.form.neighborhood}
                        disabled={
                          cepFilledFields.has("neighborhood") || locationLoading
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="@md:col-span-2">
                      <FormLabel>{t.projects.form.street}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.projects.form.streetPlaceholder}
                          disabled={
                            cepFilledFields.has("street") || locationLoading
                          }
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
                    <FormItem>
                      <FormLabel>{t.projects.form.number}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.projects.form.number}
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
                    <FormLabel>{t.projects.form.phaseLabel}</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue=""
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t.projects.form.phasePlaceholder}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_defined">
                            {t.projects.form.phaseNotDefined}
                          </SelectItem>
                          <SelectItem value="preliminary_study">
                            {t.projects.form.phasePreliminaryStudy}
                          </SelectItem>
                          <SelectItem value="basic_project">
                            {t.projects.form.phaseBasicProject}
                          </SelectItem>
                          <SelectItem value="executive_project">
                            {t.projects.form.phaseExecutiveProject}
                          </SelectItem>
                          <SelectItem value="released_for_construction">
                            {t.projects.form.phaseReleasedForConstruction}
                          </SelectItem>
                          <SelectItem value="as_built">
                            {t.projects.form.phaseAsBuilt}
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
                    <FormLabel>{t.projects.form.description}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.projects.form.descriptionPlaceholder}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siop"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.projects.form.siop}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.projects.form.siopPlaceholder}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.projects.form.apf}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.projects.form.apfPlaceholder}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isEditMode && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-shade-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                  <Checkbox
                    id="auto-create-structure"
                    checked={autoCreateStructure}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setAutoCreateStructure(checked === true)
                    }
                    className="mt-0.5 h-4 w-4 rounded data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                  />
                  <label
                    htmlFor="auto-create-structure"
                    className="text-sm font-medium leading-relaxed cursor-pointer select-none text-gray-700 dark:text-gray-100"
                  >
                    {t.projects.form.autoCreateStructureLabel}
                  </label>
                </div>
              )}

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
                      {t.drawer.importantNote}
                    </h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                      {t.drawer.importantDescription ||
                        "Os responsáveis pelos empreendimentos poderão ser contactados em até 3 anos após o fim da fase do empreendimento indicada no momento de criação do empreendimento. Este contato busca confirmar a execução dos dados informados no momento do empreendimento. A confiabilidade do nosso benchmark depende da sua colaboração. Agradecemos a compreensão!"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded-md border border-yellow-300 dark:border-yellow-700">
                  <input
                    type="checkbox"
                    id="agreement-checkbox"
                    checked={isAgreementChecked}
                    onChange={(e) => setIsAgreementChecked(e.target.checked)}
                    disabled={isEditMode}
                    className="mt-1 h-4 w-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500 cursor-pointer flex-shrink-0"
                  />
                  <label
                    htmlFor="agreement-checkbox"
                    className="text-sm font-medium text-gray-500 dark:text-gray-100 cursor-pointer select-none leading-relaxed"
                  >
                    {t.drawer.agreement ||
                      "Estou ciente da possibilidade de ser contactado para confirmação dos dados do empreendimento, conforme informado"}
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
              {t.projects.form.editButton}
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
              {t.projects.form.addButton}
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
