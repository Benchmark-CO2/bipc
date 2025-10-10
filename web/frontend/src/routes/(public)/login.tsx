import { login } from "@/actions/auth/login";
import FullLogo from "@/assets/logo_full.svg";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const Login = () => {
  const auth = useAuth();
  const navigate = useNavigate({
    from: "/login",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldsError, setFieldsError] = useState({
    email: false,
    password: false,
  });

  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const { data, mutate, isPending, isError } = useMutation({
    mutationFn: login,
  });

  const handleError = () => {
    setFieldsError({
      email: !email,
      password: !password,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (email && password) {
      mutate({ email, password });
    }
    handleError();
  };

  const navigateTo = (to: string): void => {
    navigate({
      to,
      from: "/login",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const token = data?.data.authentication_token;
    if (token) {
      auth.login(token, data?.data.user);
      navigateTo("/new_projects");
    }
  }, [data, navigate]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center transition-all overflow-auto",
        {
          block: isMobile,
        }
      )}
    >
      <div className=" flex px-6 flex-col items-center justify-center gap-4 max-xl:w-1/2 max-lg:w-full border border-zinc-200 dark:border-zinc-800 rounded-md py-8">
        <div className="w-full max-w-md">
          <div>
            <img src={FullLogo} alt="" className="w-[75%] mx-auto mb-2" />
          </div>

          <Divider className="bg-accent-foreground/10" />
          {isError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h3 className="text-red-600 dark:text-red-400 text-sm font-medium">
                {t("loginPage.error")}
              </h3>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm" htmlFor="email">
                {t("common.user")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("loginPage.placeholderEmail")}
                className={cn(
                  "text-lg",
                  fieldsError.email
                    ? "border-red-500 focus-visible:border-red-500"
                    : ""
                )}
                disabled={isPending}
                autoComplete="email"
              />
              {fieldsError.email && (
                <p className="text-red-500 text-xs">Email é obrigatório</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <label className="text-sm" htmlFor="password">
                  {t("loginPage.placeholderPassword")}
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("loginPage.placeholderPassword")}
                  className={cn(
                    "pr-10 text-md",
                    fieldsError.password
                      ? "border-red-500 focus-visible:border-red-500"
                      : ""
                  )}
                  disabled={isPending}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-3/4 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  disabled={isPending}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldsError.password && (
                <p className="text-red-500 text-xs">Senha é obrigatória</p>
              )}
            </div>

            <Button variant={"bipc"} type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                t("loginPage.buttonLogin")
              )}
            </Button>
          </form>

          <div className="flex justify-center mt-2 mb-4">
            <Button
              className="text-sm text-active underline"
              variant="link"
              onClick={() => navigateTo("/forget")}
              disabled={isPending}
            >
              {t("loginPage.buttonForgotPassword")}
            </Button>
          </div>

          <Divider className="bg-accent-foreground/10" />
          <div className="flex flex-col justify-end items-center gap-4">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              {t("loginPage.askRegister")}
            </p>
            <Button
              className="w-full"
              variant="bipc"
              onClick={() => navigateTo("/sign-up")}
              disabled={isPending}
            >
              {t("loginPage.buttonRegister")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(public)/login")({
  beforeLoad(ctx) {
    const { context } = ctx;

    if (context.auth.isAuthenticated) {
      return redirect({
        to: "/new_projects",
      });
    }
  },
  component: Login,
});
