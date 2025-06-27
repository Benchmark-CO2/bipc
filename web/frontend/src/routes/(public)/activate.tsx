import { putActivateUser } from "@/actions/users/putActivateUser";
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
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type ActivateSearch = {
  tkn?: string;
};

export const Route = createFileRoute("/(public)/activate")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ActivateSearch => {
    return {
      tkn: typeof search.tkn === "string" ? search.tkn : undefined,
    };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { tkn: token } = useSearch({ from: "/(public)/activate" });

  const activationMutation = useMutation({
    mutationFn: putActivateUser,
  });

  const handleActivateAccount = () => {
    if (!token) return;
    activationMutation.mutate(token);
  };

  const handleNavigateToLogin = () => {
    navigate({ to: "/login" });
  };

  const handleTryAgain = () => {
    activationMutation.reset();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">
              {t("activateUser.invalid.title")}
            </CardTitle>
            <CardDescription>
              {t("activateUser.invalid.description")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={handleNavigateToLogin}>
              {t("activateUser.invalid.goToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {t("activateUser.success.title")}
            </CardTitle>
            <CardDescription>
              {t("activateUser.success.description")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleNavigateToLogin}>
              {t("activateUser.success.goToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">
              {t("activateUser.error.title")}
            </CardTitle>
            <CardDescription>
              {t("activateUser.error.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {activationMutation.error?.message || t("error.errorUnknown")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleTryAgain}>
              {t("activateUser.error.retry")}
            </Button>
            {/* <Button variant="outline" onClick={handleNavigateToContact}>
              {t("activateUser.error.support")}
            </Button> */}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">
              {t("activateUser.loading.title")}
            </CardTitle>
            <CardDescription>
              {t("activateUser.loading.description")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">
            {t("activateUser.confirm.title")}
          </CardTitle>
          <CardDescription>
            {t("activateUser.confirm.description")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button onClick={handleActivateAccount} size="lg">
            {t("activateUser.confirm.confirmAction")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
