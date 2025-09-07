import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";

const createSimulationSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  active: z.boolean().default(false).optional(),
});

type CreateSimulationFormSchema = z.infer<typeof createSimulationSchema>;

const DialogCreateSimulation: React.FC = () => {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateSimulationFormSchema>({
    resolver: zodResolver(createSimulationSchema),
    defaultValues: {
      name: "",
      active: false,
    },
  });

  const handleCreateSimulation = (data: CreateSimulationFormSchema) => {
    // toast.error(t('drawerAddModule.featureNotIntegrated'))
    console.log(data);
  };

  return (
    <Dialog open={open}>
      <DialogTrigger asChild data-action="delete-project">
        <Button
          variant="secondary"
          className="ml-auto text-white"
          onClick={() => setOpen(true)}
        >
          Fazer Nova Simulação
        </Button>
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">Adicionar Simulação</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4 overflow-y-auto py-4"
            onSubmit={form.handleSubmit(handleCreateSimulation)}
            id="create-simulation-form"
          >
            <FormField
              control={form.control}
              name={`name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Nome da Simulação *</FormLabel>
                  <FormControl>
                    <Input placeholder="Simulação 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`active`}
              render={({ field }) => (
                <FormItem className="flex items-center space-y-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mb-0"
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-center">
                    Usar como referência
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" size={"lg"} onClick={() => setOpen(false)}>
            Cancelar
          </Button>

          <Button
            variant="secondary"
            size={"lg"}
            type="submit"
            form="create-simulation-form"
            className="text-white"
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DialogCreateSimulation;
