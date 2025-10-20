import { postEmailToResetPassword } from "@/actions/users/postEmailToResetPassword";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import FullLogo from "@/assets/logo_full.svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Divider from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgetPasswordFormSchema,
  type ForgetPasswordFormSchema,
} from "@/validators/forgetPasswordForm.validator";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

export const Route = createFileRoute("/(public)/forget")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { mutate, isPending, isError, isSuccess } = useMutation({
    mutationFn: postEmailToResetPassword,
  });
  const navigate = useNavigate({
    from: "/login",
  });

  const form = useForm<ForgetPasswordFormSchema>({
    resolver: zodResolver(forgetPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = (data: ForgetPasswordFormSchema) => {
    mutate(data.email);
  };

  const navigateTo = (to: string): void => {
    navigate({
      to,
      from: "/forget",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  if (isSuccess) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {t("forgetPage.successTitle")}
            </CardTitle>
            <CardDescription>{t("forgetPage.successMessage")}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              onClick={() => navigateTo("/login")}
              variant="bipc"
              className="w-full"
            >
              {t("forgetPage.backToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">{t("forgetPage.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {t("forgetPage.errorMessage")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigateTo("/login")}
              className="w-full"
            >
              {t("forgetPage.backToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isPending) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">{t("forgetPage.title")}</CardTitle>
            <CardDescription>
              {t("forgetPage.placeholderEmail")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center transition-all overflow-auto",
        {
          block: isMobile,
        }
      )}
    >
      <Card className="w-full max-w-md rounded-md">
        <CardHeader className="text-center">
          <div>
            <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
          </div>
          <Divider className="bg-accent-foreground/10" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">{t("forgetPage.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("forgetPage.placeholderEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("forgetPage.placeholderEmail")}
                        disabled={isPending}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                className="w-full"
                type="submit"
                disabled={isPending}
                variant="bipc"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("forgetPage.buttonSendEmail")}
                  </>
                ) : (
                  t("forgetPage.buttonSendEmail")
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigateTo("/login")}
            disabled={isPending}
            className="w-full"
          >
            {t("forgetPage.backToLogin")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
