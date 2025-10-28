import { postSendInvite } from "@/actions/invites/postSendInvite";
import { AddUserToProjectFormSchema } from "@/validators/addUserToProject.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleX, UserPlus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
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

const DrawerInvite = ({ projectId }: { projectId: string }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(AddUserToProjectFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const { mutate } = useMutation({
    mutationFn: ({ email }: AddUserToProjectFormSchema) =>
      postSendInvite(projectId, email),
    onSuccess: () => {
      toast.success(t("drawerInvite.title"), {
        description: t("drawerInvite.successMessage"),
        duration: 5000,
      });
      form.reset();
      ref.current?.click();
    },
    onError: () => {
      toast.error(t("drawerInvite.title"), {
        description: t("drawerInvite.errorMessage"),
        duration: 5000,
        icon: <CircleX className="stroke-destructive" size={24} />,
      });
    },
  });

  const handleSubmit = (data: AddUserToProjectFormSchema) => {
    const { email } = data;

    mutate({ email });
  };

  useEffect(() => {
    return () => {
      form.reset();
      form.clearErrors();
    };
  }, []);

  return (
    <Drawer
      direction="right"
      onClose={() => {
        form.reset();
        form.clearErrors();
      }}
    >
      <DrawerTrigger ref={ref} className="flex w-full justify-between">
        <span>{t("drawerInvite.title")}</span>
        <UserPlus size={20} className="group-[.closed]:mx-auto" />
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <DrawerHeader className="px-6">
          <DrawerTitle>{t("drawerInvite.title")}</DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          {t("drawerInvite.description")}
        </DrawerDescription>
        <Form {...form}>
          <form
            className="flex flex-col gap-10 px-6 py-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("drawerInvite.emailLabel")}</FormLabel>
                  <FormControl className="w-full">
                    <Combobox {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full mt-4">
              {t("drawerInvite.inviteButton")}
            </Button>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerInvite;
