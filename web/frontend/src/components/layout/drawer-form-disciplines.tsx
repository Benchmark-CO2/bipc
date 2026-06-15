import { patchDiscipline } from "@/actions/disciplines/patchDiscipline";
import { postDiscipline } from "@/actions/disciplines/postDiscipline";
import { getProjectCollaborators } from "@/actions/projectCollaborators/getProjectCollaborators";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { cn } from "@/lib/utils";
import { TCollaborator } from "@/types/collaborators";
import { TRole } from "@/types/disciplines";
import { TUser } from "@/types/user";
import { queryClient } from "@/utils/queryClient";
import {
  createDisciplineFormSchema,
  DisciplineFormSchema,
} from "@/validators/disciplineForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import NotFoundList from "../ui/not-found-list";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

interface IDrawerFormDisciplines {
  componentTrigger: React.ReactNode;
  projectId: string;
  unitId?: string;
  roleData?: TRole;
  projectUsers?: TCollaborator[];
  roles?: string[];
}

// Mock data for permissions - will be provided by backend
// Labels are provided via t.disciplines.permissionLabels inside the component

export default function DrawerFormDisciplines({
  componentTrigger,
  projectId,
  unitId,
  roleData,
  projectUsers,
  roles,
}: IDrawerFormDisciplines) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [managementExpanded, setManagementExpanded] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState<TUser[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [openPopover, setOpenPopover] = useState(false);

  const isEditMode = !!roleData;
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const form = useForm<DisciplineFormSchema>({
    resolver: zodResolver(createDisciplineFormSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      simulation: true,
      permissions_ids: [],
      users_ids: [],
    },
    mode: "onChange",
  });

  const { data: collaborators } = useQuery({
    queryKey: ["project-collaborators-list", projectId],
    queryFn: async () => {
      const response = await getProjectCollaborators(projectId);
      return await response.data.data.collaborators;
    },
    enabled: !projectUsers && !!projectId,
  });

  const {
    mutate: createDiscipline,
    isPending: isCreating,
    reset: resetCreation,
  } = useMutation({
    mutationFn: (data: DisciplineFormSchema) => postDiscipline(projectId, data),
    onSuccess: () => {
      toast.success(t.disciplines.createSuccess, {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["unit", projectId, unitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-permissions", projectId],
      });
      form.reset();
      setOpenDrawer(false);
    },
    onError: (error) => {
      toast.error(t.disciplines.createError, {
        description: parseApiError(error, t),
        duration: 5000,
      });
    },
  });

  const {
    mutate: updateDiscipline,
    isPending: isUpdating,
    reset: resetUpdate,
  } = useMutation({
    mutationFn: (data: DisciplineFormSchema) =>
      patchDiscipline(projectId, roleData!.id, data),
    onSuccess: () => {
      toast.success(t.disciplines.updateSuccess, {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["unit", projectId, unitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project-permissions", projectId],
      });
      form.reset();
      setOpenDrawer(false);
    },
    onError: (error) => {
      toast.error(t.disciplines.updateError, {
        description: parseApiError(error, t),
        duration: 5000,
      });
    },
  });

  const selectedPermissions =
    useWatch({
      control: form.control,
      name: "permissions_ids",
      defaultValue: [],
    }) || [];

  const watchedName = useWatch({
    control: form.control,
    name: "name",
    defaultValue: "",
  });
  const isDuplicateName =
    !!watchedName &&
    (roles ?? []).some(
      (r) =>
        r.trim().toLowerCase() === watchedName.trim().toLowerCase() &&
        (!isEditMode ||
          roleData?.name?.trim().toLowerCase() !==
            watchedName.trim().toLowerCase()),
    );

  const onSubmit = async (data: DisciplineFormSchema) => {
    if (isDuplicateName) return;
    if (isEditMode) {
      updateDiscipline(data);
      return;
    }
    createDiscipline(data);
  };

  const addCollaborator = (user: TUser) => {
    if (!selectedCollaborators.some((c) => c.id === user.id)) {
      const newCollaborators = [...selectedCollaborators, user];
      setSelectedCollaborators(newCollaborators);
      form.setValue(
        "users_ids",
        newCollaborators.map((c) => String(c.id)),
        { shouldValidate: true },
      );
    }
    setOpenPopover(false);
    setSearchTerm("");
  };

  const removeCollaborator = (userId: string) => {
    const newCollaborators = selectedCollaborators.filter(
      (c) => c.id !== userId,
    );
    setSelectedCollaborators(newCollaborators);
    form.setValue(
      "users_ids",
      newCollaborators.map((c) => String(c.id)),
      { shouldValidate: true },
    );
  };

  const getFilteredUsers = () => {
    const users = projectUsers || collaborators;
    if (!users) return [];

    // Filter out already selected collaborators
    const availableUsers = users?.filter(
      (user) => !selectedCollaborators.some((c) => c.id === user.id),
    );

    // Filter by search term
    if (!searchTerm) return availableUsers;

    const lowerSearch = searchTerm.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch),
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const togglePermission = (permissionId: number, checked: boolean) => {
    const currentPermissions = form.getValues("permissions_ids");
    const newPermissions = checked
      ? [...currentPermissions, permissionId]
      : currentPermissions.filter((id) => id !== permissionId);
    form.setValue("permissions_ids", newPermissions, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleAllManagement = (checked: boolean) => {
    const currentPermissions = form.getValues("permissions_ids");
    const managementIds = mockPermissions.management.map((p) => p.id);

    if (!checked) {
      // Remove all management permissions
      const newPermissions = currentPermissions.filter(
        (id) => !managementIds.includes(id),
      );
      form.setValue("permissions_ids", newPermissions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      // Add all management permissions
      const newPermissions = [
        ...currentPermissions.filter((id) => !managementIds.includes(id)),
        ...managementIds,
      ];
      form.setValue("permissions_ids", newPermissions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // const toggleAllSimulation = (checked: boolean) => {
  //   const currentPermissions = form.getValues("permissions_ids");
  //   const simulationIds = mockPermissions.simulation.map((p) => p.id);

  //   if (!checked) {
  //     // Remove all simulation permissions
  //     const newPermissions = currentPermissions.filter(
  //       (id) => !simulationIds.includes(id)
  //     );
  //     form.setValue("permissions_ids", newPermissions, {
  //       shouldValidate: true,
  //       shouldDirty: true,
  //     });
  //   } else {
  //     // Add all simulation permissions
  //     const newPermissions = [
  //       ...currentPermissions.filter((id) => !simulationIds.includes(id)),
  //       ...simulationIds,
  //     ];
  //     form.setValue("permissions_ids", newPermissions, {
  //       shouldValidate: true,
  //       shouldDirty: true,
  //     });
  //   }
  // };

  useEffect(() => {
    if (openDrawer) {
      resetCreation();
      resetUpdate();

      if (roleData) {
        form.reset({
          name: roleData.name || "",
          description: roleData.description || "",
          simulation: roleData.simulation || false,
          permissions_ids: roleData.permissions_ids || [],
          users_ids: roleData.users_ids || [],
        });

        // Set selected collaborators based on roleData
        if (roleData.users_ids && projectUsers) {
          const collaborators = projectUsers.filter((user) =>
            roleData.users_ids.includes(String(user.id)),
          );
          setSelectedCollaborators(collaborators);
        }
      } else {
        form.reset({
          name: "",
          description: "",
          simulation: false,
          permissions_ids: [],
          users_ids: [],
        });
        setSelectedCollaborators([]);
      }
    }
  }, [roleData, openDrawer, form, resetCreation, projectUsers]);

  const mockPermissions = {
    management: [
      { id: 2, label: t.disciplines.permissionLabels.updateProject },
      { id: 3, label: t.disciplines.permissionLabels.inviteCollaborator },
      { id: 4, label: t.disciplines.permissionLabels.removeCollaborator },
      { id: 5, label: t.disciplines.permissionLabels.removeCollaboratorInvite },
      { id: 6, label: t.disciplines.permissionLabels.createDiscipline },
      { id: 7, label: t.disciplines.permissionLabels.updateDiscipline },
      { id: 8, label: t.disciplines.permissionLabels.removeDiscipline },
      { id: 9, label: t.disciplines.permissionLabels.createBuilding },
      { id: 10, label: t.disciplines.permissionLabels.updateBuilding },
      { id: 11, label: t.disciplines.permissionLabels.removeBuilding },
    ],
    simulation: [],
  };

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
          <DrawerTitle>{t.disciplines.title}</DrawerTitle>
          <DrawerDescription>{t.disciplines.description}</DrawerDescription>
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
              id="disciplines-form"
              className="flex flex-col gap-3 rounded-md px-4 py-2 border-gray-shade-200 border bg-card"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              {/* Nome da disciplina */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.disciplines.nameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.disciplines.namePlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {isDuplicateName && (
                      <p className="text-[0.8rem] font-medium text-destructive">
                        {t.disciplines.nameDuplicate}
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Descrição */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.disciplines.descriptionLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.disciplines.descriptionPlaceholder}
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Visualizar na simulação - Switch */}
              <FormField
                control={form.control}
                name="simulation"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        {t.disciplines.showInSimulation}
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {t.disciplines.showInSimulationDescription}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Gestão Section */}
              <div className="flex flex-col border rounded-md overflow-hidden">
                <button
                  type="button"
                  className="flex items-center justify-between p-3 bg-primary text-white hover:bg-primary/90"
                  onClick={() => setManagementExpanded(!managementExpanded)}
                >
                  <span className="font-medium">
                    {t.disciplines.permissions}
                  </span>
                  {managementExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {managementExpanded && (
                  <div className="flex flex-col gap-3 p-4 bg-card">
                    <span className="text-muted-foreground text-sm">
                      {t.disciplines.permissionsDescription}
                    </span>
                    {/* Adicionar/Remover tudo */}
                    <div className="flex items-center justify-between pb-2 border-b">
                      <label
                        className="text-sm font-bold"
                        htmlFor="select-all-management"
                      >
                        {t.disciplines.selectAll}
                      </label>
                      <Checkbox
                        id="select-all-management"
                        checked={mockPermissions.management.every((p) =>
                          selectedPermissions.includes(p.id),
                        )}
                        onCheckedChange={toggleAllManagement}
                      />
                    </div>

                    {/* Lista de permissões */}
                    {mockPermissions.management.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between gap-2 "
                      >
                        <label
                          className="text-sm font-bold text-primary flex-1"
                          htmlFor={"checkbox-" + permission.id}
                        >
                          {permission.label}
                        </label>
                        <Checkbox
                          id={"checkbox-" + permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) =>
                            togglePermission(permission.id, checked as boolean)
                          }
                          className="border-px border-neutral-400/80"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar colaboradores */}
              <div className="flex flex-col gap-2">
                <FormLabel>{t.disciplines.searchCollaborators}</FormLabel>
                <span className="text-sm text-muted-foreground">
                  {t.disciplines.searchCollaboratorsDescription} <br />
                  <span className="text-sm text-yellow-600 font-medium">
                    {t.disciplines.searchCollaboratorsWarning}
                  </span>
                </span>
                <Popover open={openPopover} onOpenChange={setOpenPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPopover}
                      className="w-full justify-start text-left font-normal"
                    >
                      {t.disciplines.collaboratorPlaceholder}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={cn("w-[400px] p-0", {
                      "w-[280px]": isMobile,
                    })}
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t.disciplines.searchPlaceholder}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t.disciplines.noCollaboratorFound}
                        </CommandEmpty>
                        <CommandGroup>
                          {getFilteredUsers().map((user) => (
                            <CommandItem
                              key={user.id}
                              value={String(user.id)}
                              onSelect={() => addCollaborator(user)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium text-xs">
                                  {getInitials(user.name)}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium text-sm truncate">
                                    {user.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Lista de colaboradores selecionados */}
              {selectedCollaborators.length === 0 ? (
                <NotFoundList
                  message={t.disciplines.noCollaboratorAdded}
                  description={t.disciplines.noCollaboratorDescription}
                  icon="file"
                  showIcon={false}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedCollaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 rounded-md border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                          {getInitials(collaborator.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">
                            {collaborator.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {collaborator.email}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeCollaborator(collaborator.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {form.formState.errors.users_ids && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.users_ids.message}
                </p>
              )}
            </form>
          </div>
        </Form>
        <DrawerFooter className="px-8 py-4">
          {isEditMode ? (
            <Button
              type="submit"
              form="disciplines-form"
              variant={"bipc"}
              disabled={isDuplicateName || isUpdating}
            >
              {t.disciplines.saveChanges}
              {isUpdating && (
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          ) : (
            <Button
              variant={"bipc"}
              type="submit"
              form="disciplines-form"
              disabled={isDuplicateName || isCreating}
            >
              {t.disciplines.addDiscipline}
              {isCreating && (
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
              )}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
