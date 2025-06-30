/* eslint-disable @typescript-eslint/no-misused-promises */

import { register } from "@/actions/auth/register";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  registerFormSchema,
  RegisterFormSchema,
} from "@/validators/registerForm.validator";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { DialogSuccessSignup } from "@/components/layout/dialogs/dialog-success-signup";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const SignUp = () => {
  const [successModal, setSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const form = useForm<RegisterFormSchema>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { isPending, mutate } = useMutation({
    mutationFn: register,
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        form.setError("email", {
          type: "custom",
          message: "Email já cadastrado",
        });
      }
    },
    onSuccess() {
      toast.success(t("signUp.dialog.success.title"), {
        description: t("signUp.dialog.success.content"),
      });
      setSuccessModal(true);
    },
  });
  const handleSubmit = (data: RegisterFormSchema) => {
    const { name, email, password } = data;
    mutate({
      name,
      email,
      password,
    });
  };

  const handleClose = () => {
    setSuccessModal(false);
    navigate({ to: "/login", from: "/sign-up" });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="w-full h-full flex transition-all justify-center items-center">
      <div className="w-2/3 h-full max-lg:hidden max-xl:w-1/2"></div>
      <div className="flex w-1/3 flex-col items-center justify-center gap-4 max-xl:w-1/2 max-lg:w-full px-4">
        <div className="w-full max-w-md">
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <h1 className="font-bold text-3xl mb-6 w-full text-center">
                {t("signUp.title")}
              </h1>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("signUp.name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("signUp.name")}
                        disabled={isPending}
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("signUp.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("signUp.email")}
                        disabled={isPending}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("signUp.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("signUp.password")}
                          disabled={isPending}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          disabled={isPending}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("signUp.confirmPassword")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("signUp.confirmPassword")}
                          disabled={isPending}
                          autoComplete="new-password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={toggleConfirmPasswordVisibility}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          disabled={isPending}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full mt-6 bg-zinc-600 text-white hover:bg-zinc-700 disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  t("signUp.buttonSignUp")
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 bg-transparent border border-zinc-600 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => navigate({ to: "/login", from: "/sign-up" })}
                disabled={isPending}
              >
                {t("signUp.buttonHaveAccount")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
      {successModal && <DialogSuccessSignup handleClose={handleClose} />}
    </div>
  );
};
export const Route = createFileRoute("/(public)/sign-up")({
  beforeLoad(ctx) {
    const { context } = ctx;

    if (context.auth.isAuthenticated) {
      return redirect({
        to: "/dashboard",
      });
    }
  },
  component: SignUp,
});
