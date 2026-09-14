import { postSendInvite } from "@/actions/invites/postSendInvite";
import {
  AddUserToProjectFormSchema,
  createAddUserToProjectFormSchema,
} from "@/validators/addUserToProject.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleX, UserPlus, X, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { parseApiError } from "@/utils/parseApiError";
import { Button } from "../ui/button";
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
import { queryClient } from "@/utils/queryClient";
import { useTranslation } from "@/i18n";

const DrawerInvite = ({ projectId }: { projectId: string }) => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const { t } = useTranslation();

  const form = useForm({
    resolver: zodResolver(createAddUserToProjectFormSchema(t)),
    defaultValues: {
      email: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ email }: AddUserToProjectFormSchema) =>
      postSendInvite(projectId, email),
    onSuccess: () => {
      toast.success(t.invites.drawerTitle, {
        description: t.invites.inviteSuccess,
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project-invites", projectId],
      });
      form.reset();
      setOpenDrawer(false);
    },
    onError: (error) => {
      toast.error(t.invites.drawerTitle, {
        description: parseApiError(error, t),
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
    if (openDrawer) {
      form.reset();
      form.clearErrors();
    }
  }, [openDrawer, form]);

  return (
    <Drawer direction="right" open={openDrawer} dismissible={false}>
      <DrawerTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
          setOpenDrawer(true);
        }}
      >
        <Button variant="bipc" size="lg">
          <UserPlus className="mr-2 h-4 w-4" />
          {t.invites.drawerTitle}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <DrawerHeader className="px-8">
          <DrawerTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t.invites.drawerTitle}
          </DrawerTitle>
          <DrawerDescription>{t.invites.drawerDescription}</DrawerDescription>
          <Button
            onClick={() => setOpenDrawer(false)}
            className="absolute right-4 top-2"
            variant="ghost"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <Form {...form}>
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-8">
            <form
              id="invite-form"
              className="flex flex-col gap-4 rounded-md px-4 py-4 border-gray-shade-200 border bg-card"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.invites.emailLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="exemplo@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </div>
        </Form>
        <DrawerFooter className="px-8 py-4">
          <Button
            type="submit"
            form="invite-form"
            variant="bipc"
            disabled={isPending}
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isPending ? t.invites.sending : t.invites.inviteButton}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerInvite;
