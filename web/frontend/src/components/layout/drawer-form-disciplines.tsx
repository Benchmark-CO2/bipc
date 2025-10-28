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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  disciplineFormSchema,
  DisciplineFormSchema,
} from "@/validators/disciplineForm.validator";
import { cn } from "@/lib/utils";

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

export default function DrawerFormDisciplines({
  componentTrigger,
}: IDrawerFormDisciplines) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [disciplineType, setDisciplineType] = useState<
    "management" | "simulations"
  >("management");
  const [managementExpanded, setManagementExpanded] = useState(true);
  const [simulationsExpanded, setSimulationsExpanded] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(
    []
  );

  const form = useForm<DisciplineFormSchema>({
    resolver: zodResolver(disciplineFormSchema),
    defaultValues: {
      name: "",
      description: "",
      management: {
        edit_project: false,
        create_discipline: false,
        create_unit: false,
        generate_project_report: false,
      },
      simulations: {
        create_unit: false,
        generate_unit_report: false,
      },
      collaborators: [],
    },
  });

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

  const toggleDisciplineType = (type: "management" | "simulations") => {
    setDisciplineType(type);
    // Update checkboxes based on selected type
    if (type === "management") {
      form.setValue("simulations.create_unit", false);
      form.setValue("simulations.generate_unit_report", false);
    } else {
      form.setValue("management.edit_project", false);
      form.setValue("management.create_discipline", false);
      form.setValue("management.create_unit", false);
      form.setValue("management.generate_project_report", false);
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

              {/* Tipo de disciplina */}
              <div className="flex flex-col gap-2">
                <FormLabel>Tipo de disciplina</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      disciplineType === "management" ? "bipc" : "outline"
                    }
                    className={cn(
                      "flex items-center gap-2",
                      disciplineType === "management" &&
                        "bg-[#00796B] hover:bg-[#00796B]/90"
                    )}
                    onClick={() => toggleDisciplineType("management")}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        disciplineType === "management"
                          ? "bg-white"
                          : "bg-[#00796B]"
                      )}
                    />
                    Gestão
                  </Button>
                  <Button
                    type="button"
                    variant={
                      disciplineType === "simulations" ? "bipc" : "outline"
                    }
                    className={cn(
                      "flex items-center gap-2",
                      disciplineType === "simulations" &&
                        "bg-[#00796B] hover:bg-[#00796B]/90"
                    )}
                    onClick={() => toggleDisciplineType("simulations")}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        disciplineType === "simulations"
                          ? "bg-white"
                          : "bg-[#00796B]"
                      )}
                    />
                    Simulação
                  </Button>
                </div>
              </div>

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
                    <FormField
                      control={form.control}
                      name="management.edit_project"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Editar propriedades do projeto
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="management.create_discipline"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Criar disciplina
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="management.create_unit"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Criar unidades
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="management.generate_project_report"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Gerar relatórios do projeto
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Simulação Section */}
              <div className="flex flex-col border rounded-md overflow-hidden">
                <button
                  type="button"
                  className="flex items-center justify-between p-3 bg-[#00796B] text-white hover:bg-[#00796B]/90"
                  onClick={() => setSimulationsExpanded(!simulationsExpanded)}
                >
                  <span className="font-medium">Simulação</span>
                  {simulationsExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {simulationsExpanded && (
                  <div className="flex flex-col gap-3 p-4 bg-card">
                    <FormField
                      control={form.control}
                      name="simulations.create_unit"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Criar unidades
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="simulations.generate_unit_report"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Gerar relatórios das unidades
                          </FormLabel>
                        </FormItem>
                      )}
                    />
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
