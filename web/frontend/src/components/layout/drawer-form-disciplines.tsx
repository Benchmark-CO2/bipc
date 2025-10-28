import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  disciplineFormSchema,
  DisciplineFormSchema,
} from "@/validators/disciplineForm.validator";

interface IDrawerFormDisciplines {
  componentTrigger: React.ReactNode;
}

// Mock data for collaborators - replace with real data later
const mockCollaborators = [
  {
    id: "1",
    name: "Lorem Ipsum",
    email: "lorem.ipsum@example.com",
    initials: "LI",
  },
  { id: "2", name: "Lorem Ipsum", email: "lorem2@example.com", initials: "LI" },
];

// Mock data for permissions - will be provided by backend
const mockPermissions = {
  management: [
    { id: 1, label: "Editar propriedades do projeto" },
    { id: 2, label: "Criar disciplina" },
    { id: 3, label: "Criar unidades" },
    { id: 4, label: "Gerar relatórios do projeto" },
  ],
  simulation: [
    { id: 5, label: "Criar unidades" },
    { id: 6, label: "Gerar relatórios das unidades" },
  ],
};

export default function DrawerFormDisciplines({
  componentTrigger,
}: IDrawerFormDisciplines) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [managementExpanded, setManagementExpanded] = useState(true);
  const [simulationExpanded, setSimulationExpanded] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    []
  );

  const form = useForm<DisciplineFormSchema>({
    resolver: zodResolver(disciplineFormSchema),
    defaultValues: {
      name: "",
      description: "",
      simulation: false,
      permissions_ids: [],
      collaborators: [],
    },
    mode: "onChange",
  });

  const selectedPermissions =
    useWatch({
      control: form.control,
      name: "permissions_ids",
      defaultValue: [],
    }) || [];

  const onSubmit = async (data: DisciplineFormSchema) => {
    console.log(data);
    // TODO: Implement API call to create/update discipline
  };

  const isEditMode = false;

  const addCollaborator = (collaboratorId: string) => {
    if (!selectedCollaborators.includes(collaboratorId)) {
      const newCollaborators = [...selectedCollaborators, collaboratorId];
      setSelectedCollaborators(newCollaborators);
      form.setValue("collaborators", newCollaborators);
    }
  };

  const removeCollaborator = (collaboratorId: string) => {
    const newCollaborators = selectedCollaborators.filter(
      (id) => id !== collaboratorId
    );
    setSelectedCollaborators(newCollaborators);
    form.setValue("collaborators", newCollaborators);
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
        (id) => !managementIds.includes(id)
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

  const toggleAllSimulation = (checked: boolean) => {
    const currentPermissions = form.getValues("permissions_ids");
    const simulationIds = mockPermissions.simulation.map((p) => p.id);

    if (!checked) {
      // Remove all simulation permissions
      const newPermissions = currentPermissions.filter(
        (id) => !simulationIds.includes(id)
      );
      form.setValue("permissions_ids", newPermissions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      // Add all simulation permissions
      const newPermissions = [
        ...currentPermissions.filter((id) => !simulationIds.includes(id)),
        ...simulationIds,
      ];
      form.setValue("permissions_ids", newPermissions, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  return (
    <Drawer direction="right" open={openDrawer} dismissible={false}>
      <DrawerTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
          setOpenDrawer(true);
        }}
      >
        {componentTrigger}
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <DrawerHeader className="px-8">
          <DrawerTitle>
            {isEditMode ? "Editar Disciplina" : "Adicionar Disciplina"}
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
                    <FormLabel>Nome da disciplina *</FormLabel>
                    <FormControl>
                      <Input placeholder="Vedações" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrição */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Projetos de alvenaria estrutural"
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
                        Visualizar na simulação
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Habilita esta disciplina para aparecer nas simulações
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
                  className="flex items-center justify-between p-3 bg-[#00796B] text-white hover:bg-[#00796B]/90"
                  onClick={() => setManagementExpanded(!managementExpanded)}
                >
                  <span className="font-medium">Gestão</span>
                  {managementExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {managementExpanded && (
                  <div className="flex flex-col gap-3 p-4 bg-card">
                    {/* Adicionar/Remover tudo */}
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">
                        Selecionar todas
                      </span>
                      <Checkbox
                        checked={mockPermissions.management.every((p) =>
                          selectedPermissions.includes(p.id)
                        )}
                        onCheckedChange={toggleAllManagement}
                      />
                    </div>

                    {/* Lista de permissões */}
                    {mockPermissions.management.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-normal flex-1">
                          {permission.label}
                        </span>
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) =>
                            togglePermission(permission.id, checked as boolean)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulação Section */}
              <div className="flex flex-col border rounded-md overflow-hidden">
                <button
                  type="button"
                  className="flex items-center justify-between p-3 bg-[#00796B] text-white hover:bg-[#00796B]/90"
                  onClick={() => setSimulationExpanded(!simulationExpanded)}
                >
                  <span className="font-medium">Simulação</span>
                  {simulationExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {simulationExpanded && (
                  <div className="flex flex-col gap-3 p-4 bg-card">
                    {/* Adicionar/Remover tudo */}
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-sm font-medium">
                        Selecionar todas
                      </span>
                      <Checkbox
                        checked={mockPermissions.simulation.every((p) =>
                          selectedPermissions.includes(p.id)
                        )}
                        onCheckedChange={toggleAllSimulation}
                      />
                    </div>

                    {/* Lista de permissões */}
                    {mockPermissions.simulation.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm font-normal flex-1">
                          {permission.label}
                        </span>
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked) =>
                            togglePermission(permission.id, checked as boolean)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar colaboradores */}
              <div className="flex flex-col gap-2">
                <FormLabel>Buscar colaboradores</FormLabel>
                <Input placeholder="Colaborador..." className="w-full" />
              </div>

              {/* Lista de colaboradores selecionados */}
              {selectedCollaborators.length > 0 && (
                <div className="flex flex-col gap-2">
                  {mockCollaborators
                    .filter((c) => selectedCollaborators.includes(c.id))
                    .map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00796B] text-white flex items-center justify-center font-medium">
                            {collaborator.initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-[#00796B]">
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

              {/* Colaboradores disponíveis (mock) */}
              {mockCollaborators.length > 0 && (
                <div className="flex flex-col gap-2">
                  {mockCollaborators
                    .filter((c) => !selectedCollaborators.includes(c.id))
                    .map((collaborator) => (
                      <button
                        key={collaborator.id}
                        type="button"
                        className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent transition-colors"
                        onClick={() => addCollaborator(collaborator.id)}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00796B] text-white flex items-center justify-center font-medium">
                          {collaborator.initials}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-[#00796B]">
                            {collaborator.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {collaborator.email}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </form>
          </div>
        </Form>
        <DrawerFooter className="px-8 py-4">
          {isEditMode ? (
            <Button type="submit" form="disciplines-form" variant={"bipc"}>
              Salvar alterações
            </Button>
          ) : (
            <Button variant={"bipc"} type="submit" form="disciplines-form">
              Adicionar disciplina
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
