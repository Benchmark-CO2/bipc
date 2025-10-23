import { putResetPassword } from "@/actions/users/putResetPassword";
import FullLogo from "@/assets/logo_full.svg";
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
import Divider from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormSchema,
} from "@/validators/resetPasswordForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

type ActivateSearch = {
  tkn?: string;
};

export const Route = createFileRoute("/(public)/reset")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ActivateSearch => {
    return {
      tkn: typeof search.tkn === "string" ? search.tkn : undefined,
    };
  },
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      context.auth.logout();
    }
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { tkn: token } = useSearch({ from: "/(public)/reset" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormSchema>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  const resetPassMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      putResetPassword(token, password),
  });

  const onSubmit = (data: ResetPasswordFormSchema) => {
    if (!token) return;
    resetPassMutation.mutate({ token, password: data.password });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNavigateToLogin = () => {
    navigate({ to: "/login" });
  };

  const handleTryAgain = () => {
    resetPassMutation.reset();
  };

  if (!token) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
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
            <CardTitle className="text-xl">
              {t("resetPassword.invalid.title")}
            </CardTitle>
            <CardDescription>
              {t("resetPassword.invalid.description")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleNavigateToLogin}
              className="w-full"
            >
              {t("resetPassword.invalid.goToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetPassMutation.isSuccess) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {t("resetPassword.success.title")}
            </CardTitle>
            <CardDescription>
              {t("resetPassword.success.description")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              variant="bipc"
              className="w-full"
              onClick={handleNavigateToLogin}
            >
              {t("resetPassword.success.goToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetPassMutation.isError) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">
              {t("resetPassword.error.title")}
            </CardTitle>
            <CardDescription>
              {t("resetPassword.error.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {resetPassMutation.error?.message || t("error.errorUnknown")}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={handleTryAgain}
              className="w-full"
            >
              {t("resetPassword.error.retry")}
            </Button>
            {/* <Button variant="outline" onClick={handleNavigateToContact}>
                {t("resetPassword.error.support")}
              </Button> */}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetPassMutation.isPending) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto",
          {
            block: isMobile,
          }
        )}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">
              {t("resetPassword.loading.title")}
            </CardTitle>
            <CardDescription>
              {t("resetPassword.loading.description")}
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div>
            <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
          </div>
          <Divider className="bg-accent-foreground/10" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">
            {t("resetPassword.confirm.title")}
          </CardTitle>
          <CardDescription>
            {t("resetPassword.confirm.description")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("forms.fields.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("loginPage.placeholderPassword")}
                  className={`pr-10 ${errors.password ? "border-red-500 focus-visible:border-red-500" : ""}`}
                  disabled={resetPassMutation.isPending}
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  disabled={resetPassMutation.isPending}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("forms.fields.confirmPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("forms.fields.confirmPassword")}
                  className={`pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:border-red-500" : ""}`}
                  disabled={resetPassMutation.isPending}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  disabled={resetPassMutation.isPending}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center mt-4">
            <Button
              type="submit"
              size="lg"
              variant="bipc"
              disabled={resetPassMutation.isPending}
              className="w-full"
            >
              {resetPassMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("resetPassword.loading.title")}
                </>
              ) : (
                t("resetPassword.confirm.confirmAction")
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
