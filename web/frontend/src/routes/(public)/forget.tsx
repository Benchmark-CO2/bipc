import { postEmailToResetPassword } from "@/actions/users/postEmailToResetPassword";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(public)/forget")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [fieldsError, setFieldsError] = useState({
    email: false,
  });
  const { t } = useTranslation();
  const { mutate, isPending, isError, isSuccess } = useMutation({
    mutationFn: postEmailToResetPassword,
  });
  const navigate = useNavigate({
    from: "/login",
  });

  const handleError = () => {
    setFieldsError({
      email: !email,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (email) {
      mutate(email);
    }
    handleError();
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
      <div className="w-full h-full flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {t("forgetPage.successTitle")}
            </CardTitle>
            <CardDescription>{t("forgetPage.successMessage")}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigateTo("/login")} variant="bipc">
              {t("forgetPage.backToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">{t("forgetPage.title")}</CardTitle>
            <CardDescription>{t("forgetPage.errorMessage")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {t("forgetPage.errorMessage")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigateTo("/login")}>
              {t("forgetPage.backToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
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
    <div className="w-full h-full flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">{t("forgetPage.title")}</CardTitle>
          <CardDescription>{t("forgetPage.placeholderEmail")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("forgetPage.placeholderEmail")}
                className={`${fieldsError.email ? "border-red-500 focus-visible:border-red-500" : ""}`}
                disabled={isPending}
                autoComplete="email"
              />
              {fieldsError.email && (
                <p className="text-red-500 text-xs">
                  {t("forgetPage.emailIsRequired")}
                </p>
              )}
            </div>
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
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigateTo("/login")}
            disabled={isPending}
          >
            {t("forgetPage.backToLogin")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
