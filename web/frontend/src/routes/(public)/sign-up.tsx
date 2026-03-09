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
import { DialogWarnSignup } from "@/components/layout/dialogs/dialog-warn-signup";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Divider from "@/components/ui/divider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { masks } from "@/utils/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DrawerDocuments from "@/components/layout/drawer-documents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      crea_cau: "",
      birthdate: "",
      city: "",
      activity: "",
      enterprise: "",
    },
  });
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [warnModalIsOpen, setWarnModalIsOpen] = useState(false);
  const { isPending, mutate } = useMutation({
    mutationFn: register,
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        form.setError("email", {
          type: "custom",
          message: "Email já cadastrado",
        });
      }
      toast.error("Algo deu errado", {
        description: error.message || "Não foi possível completar o cadastro",
      });
    },
    onSuccess() {
      toast.success(t("signUp.dialog.success.title"), {
        description: t("signUp.dialog.success.content"),
      });
      setSuccessModal(true);
    },
  });
  const handleSubmit = (data: RegisterFormSchema) => {
    const {
      name,
      email,
      password,
      birthdate,
      crea_cau,
      city,
      activity,
      enterprise,
    } = data;

    // Converte a data de DD/MM/YYYY para ISO format com timezone (RFC3339)
    let birthdateISO: string | undefined;
    if (birthdate && birthdate.trim() !== "") {
      const cleanDate = birthdate.replace(/\D/g, "");
      const day = cleanDate.substring(0, 2);
      const month = cleanDate.substring(2, 4);
      const year = cleanDate.substring(4, 8);
      // Formato: YYYY-MM-DDTHH:MM:SSZ (usando meia-noite UTC)
      birthdateISO = `${year}-${month}-${day}T00:00:00Z`;
    }

    mutate({
      name,
      email,
      password,
      ...(crea_cau && crea_cau.trim() !== "" && { crea_cau }),
      ...(birthdateISO && { birthdate: birthdateISO }),
      ...(city && city.trim() !== "" && { city }),
      ...(activity && activity.trim() !== "" && { activity }),
      ...(enterprise && enterprise.trim() !== "" && { enterprise }),
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Novo Usuário
        </h1>
        <p className="text-muted-foreground">
          Crie sua conta para começar a usar a plataforma
        </p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(() => setWarnModalIsOpen(true))}
            >
              <p className="font-bold text-lg">Informações pessoais</p>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>{t("signUp.name")} *</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Obrigatório. Para podermos te identificar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
                    <div className="flex items-center gap-1.5">
                      <FormLabel>Email *</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Obrigatório. Para permitir seu acesso a plataforma
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        disabled={isPending}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                <FormField
                  control={form.control}
                  name="crea_cau"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>Registro CREA/CAU</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Para nos certificarmos que relatórios
                                certificados sejam emitidos apenas para
                                profissionais ativos
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={"26.2024.9999999"}
                          disabled={isPending}
                          autoComplete="none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>{t("signUp.birthDate")}</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Para autenticar a veracidade da identidade</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder={"DD/MM/AAAA"}
                          disabled={isPending}
                          autoComplete="bday"
                          value={masks.date(field.value || "")}
                          onChange={(e) =>
                            field.onChange(masks.date(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>{t("signUp.city")}</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Para vincular os dados do usuário a uma
                                localidade
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="text" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("signUp.password")} *</FormLabel>
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
                      <FormLabel>{t("signUp.confirmPassword")} *</FormLabel>
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
              </div>
              <Divider className="bg-accent-foreground/10" />
              <p className="font-bold text-lg">Informações profissionais</p>
              <FormField
                control={form.control}
                name="activity"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>{t("signUp.activityArea")}</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Para identificar a função realizada em colaboração
                              com outros profissionais em um empreendimento
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full" disabled={isPending}>
                          <SelectValue placeholder={t("signUp.activityArea")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arquitetura">
                            Arquitetura
                          </SelectItem>
                          <SelectItem value="Engenharia Civil">
                            Engenharia Civil
                          </SelectItem>
                          <SelectItem value="Coordenação de Projetos">
                            Coordenação de Projetos
                          </SelectItem>
                          <SelectItem value="Pesquisador(a)">
                            Pesquisa
                          </SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enterprise"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>{t("signUp.companyName")}</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Para identificar a organização em que o
                              profissional colabora
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t("signUp.companyName")}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 mt-2">
                <FormField
                  control={form.control}
                  name="privacyPolicyAccepted"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          className="self-start"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm text-foreground">
                          Eu declaro estar ciente sobre o uso dos meus dados
                          para as finalidades informadas no formulário de
                          cadastro e concordo a{" "}
                          <DrawerDocuments documentType="privacy-policy" />.
                        </span>
                      </div>
                      <FormMessage className="ml-6" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm text-foreground">
                          Eu declaro estar de acordo com os{" "}
                          <DrawerDocuments documentType="terms-of-use" /> da
                          plataforma
                        </span>
                      </div>
                      <FormMessage className="ml-6" />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                variant={"bipc"}
                type="submit"
                disabled={isPending}
                className="w-auto max-md:w-full px-2 text-base ml-auto mt-4"
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

              {/* <Button
                type="button"
                variant="outline"
                className="w-full mt-2 bg-transparent border border-zinc-600 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                onClick={() => navigate({ to: "/login", from: "/sign-up" })}
                disabled={isPending}
              >
                {t("signUp.buttonHaveAccount")}
              </Button> */}
            </form>
          </Form>
        </CardContent>
      </Card>
      {warnModalIsOpen && (
        <DialogWarnSignup
          handleClose={() => setWarnModalIsOpen(false)}
          handleConfirm={() => {
            handleSubmit(form.getValues());
            setWarnModalIsOpen(false);
          }}
        />
      )}
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
