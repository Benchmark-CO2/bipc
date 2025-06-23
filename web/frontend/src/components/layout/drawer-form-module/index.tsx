import {
  ModuleFormSchema,
  moduleFormSchema,
} from "@/validators/moduleForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
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
  unitId: string;
  moduleId?: string;
}

const DrawerFormModule = ({
  triggerComponent,
  moduleId,
}: DrawerFormModuleProps) => {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleSubmit = (data: ModuleFormSchema) => {
    console.log("=== SUBMIT TRIGGERED ===");

    // Campos base sempre enviados
    const baseFields = {
      name: data.name,
      structure_type: data.structure_type,
      floor_repetition: data.floor_repetition,
      floor_area: data.floor_area,
      floor_height: data.floor_height,
    };

    // Filtrar apenas os campos relevantes para o tipo de estrutura
    let filteredData;

    if (data.structure_type === "beam_column") {
      filteredData = {
        ...baseFields,
        concrete_columns: data.concrete_columns,
        concrete_beams: data.concrete_beams,
        concrete_slabs: data.concrete_slabs,
        steel_ca50: data.steel_ca50,
        steel_ca60: data.steel_ca60,
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
        concrete_walls: data.concrete_walls,
        concrete_slabs: data.concrete_slabs,
        steel_ca50: data.steel_ca50,
        steel_ca60: data.steel_ca60,
        wall_thickness: data.wall_thickness,
        slab_thickness: data.slab_thickness,
        form_area: data.form_area,
        wall_area: data.wall_area,
      };
    } else if (data.structure_type === "structural_masonry") {
      filteredData = {
        ...baseFields,
        vertical_grout: data.vertical_grout,
        horizontal_grout: data.horizontal_grout,
        steel_ca50: data.steel_ca50,
        steel_ca60: data.steel_ca60,
        blocks: data.blocks,
      };
    }

    console.log("Filtered module form data:", filteredData);

    // TODO: Implementar endpoints de criação/edição de módulos
    toast.success(
      moduleId
        ? "Módulo atualizado com sucesso!"
        : "Módulo criado com sucesso!",
      { duration: 3000 }
    );
    setIsOpen(false);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const structureTypes = [
    { value: "beam_column", label: "Viga Pilar" },
    { value: "concrete_wall", label: "Parede de Concreto" },
    { value: "structural_masonry", label: "Alvenaria Estrutural" },
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
      <DrawerContent className="min-w-3/5">
        <DrawerHeader className="px-6">
          <DrawerTitle>
            {moduleId ? "Editar Módulo" : "Adicionar Módulo"}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          Configure os dados estruturais do módulo
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
                      <FormLabel>Nome do Módulo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome do módulo"
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
                      <FormLabel>Tipo de Estrutura</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo de estrutura" />
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
                      <FormLabel>Repetição de Andares</FormLabel>
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
                      <FormLabel>Área do Andar (m²)</FormLabel>
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
                      <FormLabel>Altura do Andar (m)</FormLabel>
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

              <Button type="submit" variant="noStyles" className="mt-6 w-full">
                {moduleId ? "Atualizar Módulo" : "Criar Módulo"}
              </Button>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerFormModule;
