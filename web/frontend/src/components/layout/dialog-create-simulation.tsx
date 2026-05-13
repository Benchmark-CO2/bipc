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
import { postOption } from "@/actions/options/postOption";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";

const createSimulationSchema = z.object({
  name: z.string().min(1, "nameRequired"),
  active: z.boolean().default(true).optional(),
});

type CreateSimulationFormSchema = z.infer<typeof createSimulationSchema>;

interface DialogCreateSimulationProps {
  projectId: string;
  unitId: string;
  roleId: string;
  triggerComponent?: React.ReactNode;
}

const DialogCreateSimulation: React.FC<DialogCreateSimulationProps> = ({
  projectId,
  unitId,
  roleId,
  triggerComponent,
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const createSimulationMutation = useMutation({
    mutationFn: (data: { name: string; active: boolean }) =>
      postOption(projectId, unitId, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
      toast.success(t.dialogCreateSimulation.successCreate);
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      console.error(t.dialogCreateSimulation.errorCreate, error);
    },
  });

  const form = useForm<CreateSimulationFormSchema>({
    resolver: zodResolver(createSimulationSchema),
    defaultValues: {
      name: "",
      active: true,
    },
  });

  const handleCreateSimulation = (data: CreateSimulationFormSchema) => {
    createSimulationMutation.mutate({
      name: data.name,
      active: data.active || true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild data-action="delete-project">
        {triggerComponent || (
          <Button
            variant="secondary"
            className="ml-auto text-white"
            onClick={() => setOpen(true)}
          >
            {t.constructiveTechView.newSimulation}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{t.constructiveTechView.newSimulation}</DialogTitle>
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
                  <FormLabel className="text-sm">{t.dialogCreateSimulation.simulationName} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t.dialogCreateSimulation.placeholder} {...field} />
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
                    {t.dialogCreateSimulation.useAsReference}
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" size={"lg"} onClick={() => setOpen(false)}>
            {t.common.cancel}
          </Button>

          <Button
            variant="secondary"
            size={"lg"}
            type="submit"
            form="create-simulation-form"
            className="text-white"
            disabled={createSimulationMutation.isPending}
          >
            {createSimulationMutation.isPending ? t.dialogCreateSimulation.creating : t.dialogCreateSimulation.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DialogCreateSimulation;
