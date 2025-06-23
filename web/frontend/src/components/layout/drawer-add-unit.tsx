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
import { useState } from "react";
import UnitFormTower from "./unit-form-tower";
import { postUnit } from "@/actions/units/postUnit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface DrawerAddUnitProps {
  triggerComponent?: React.ReactNode;
  projectId: string;
}
const DrawerAddUnit = ({ triggerComponent, projectId }: DrawerAddUnitProps) => {
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
    // isSuccess: isCreationSuccess,
    // isPending: isCreationPending,
    mutate: mutateCreation,
    // reset: resetCreation,
  } = useMutation({
    mutationFn: (data: UnitFormSchema) => postUnit(data, projectId),
    onError: () => {
      toast.error("Erro", {
        description: "Erro ao criar o projeto",
        duration: 5000,
      });
    },
    onSuccess: (data) => {
      toast.success("Projeto criado com sucesso", {
        description: "O projeto foi criado com sucesso",
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["units"],
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

  const handleSubmit = (data: UnitFormSchema) => {
    mutateCreation(data);
  };

  const handleClose = () => {
    form.reset();
    setIsOpen(false);
  };

  const unitTypes = [{ value: "tower", label: "Torre" }];

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
          <DrawerTitle>Adicionar Unidade de Construção</DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          Aqui terá uma descrição do que é a unidade de construção, como ela
          deve ser utilizada e quais são os campos obrigatórios.
        </DrawerDescription>
        <div className="mx-auto w-full p-6">
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
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Torre A" {...field} />
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
                      <FormLabel>Tipo de Unidade *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={unitTypes.length <= 1}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo" />
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
              {form.watch("type") === "tower" && <UnitFormTower form={form} />}
              <Button type="submit" variant="noStyles" className="mt-6 w-full">
                Criar Unidade
              </Button>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerAddUnit;
