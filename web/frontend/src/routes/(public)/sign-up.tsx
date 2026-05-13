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
  RegisterFormSchema,
  createRegisterFormSchema,
} from "@/validators/registerForm.validator";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useNavigate,
} from "@tanstack/react-router";

import { DialogSuccessSignup } from "@/components/layout/dialogs/dialog-success-signup";
import { DialogWarnSignup } from "@/components/layout/dialogs/dialog-warn-signup";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CityCombobox } from "@/components/ui/city-combobox";
import Divider from "@/components/ui/divider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCep from "@/hooks/useLocation";
import useCities from "@/hooks/useCities";
import { masks } from "@/utils/masks";
import { states } from "@/utils/states";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import {
  Building2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomLink } from "@/components/ui/custom-link";
import { useTranslation } from "@/i18n";

const SignUp = () => {
  const { t } = useTranslation();
  const [successModal, setSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [filledByCep, setFilledByCep] = useState(false);
  const [cepFilledFields, setCepFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [selectedState, setSelectedState] = useState("");

  const form = useForm<RegisterFormSchema>({
    resolver: zodResolver(createRegisterFormSchema(t)),
    defaultValues: {
      type: "member",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      cnpj: "",
      crea_cau: "",
      birthdate: "",
      city: "",
      activity: "",
      enterprise: "",
      cep: "",
      state: "",
      neighborhood: "",
      street: "",
      number: "",
      complement: "",
    },
  });

  const userType = form.watch("type");
  const isCompany = userType === "company";

  const navigate = useNavigate();
  const [warnModalIsOpen, setWarnModalIsOpen] = useState(false);

  const {
    data: locationData,
    isError: cepError,
    isLoading: locationLoading,
    searchCep,
  } = useCep();

  const {
    cities,
    isLoading: citiesLoading,
    isError: citiesError,
  } = useCities(selectedState);
  const { isPending, mutate } = useMutation({
    mutationFn: register,
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        form.setError("email", {
          type: "custom",
          message: t.auth.signUp.emailAlreadyRegistered,
        });
      }
      toast.error(t.common.unknownError, {
        description: error.message || t.common.unknownError,
      });
    },
    onSuccess() {
      toast.success(t.auth.signUp.successTitle, {
        description: t.auth.signUp.successContent,
      });
      setSuccessModal(true);
    },
  });
  const handleSubmit = (data: RegisterFormSchema) => {
    const {
      name,
      email,
      password,
      type,
      birthdate,
      cnpj,
      crea_cau,
      city,
      activity,
      enterprise,
      cep,
      state,
      neighborhood,
      street,
      number,
      complement,
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
      type,
      ...(cnpj && cnpj.trim() !== "" && { cnpj: cnpj.replace(/\D/g, "") }),
      ...(crea_cau && crea_cau.trim() !== "" && { crea_cau }),
      ...(birthdateISO && { birthdate: birthdateISO }),
      ...(city && city.trim() !== "" && { city }),
      ...(activity && activity.trim() !== "" && { activity }),
      ...(enterprise && enterprise.trim() !== "" && { enterprise }),
      ...(cep && cep.trim() !== "" && { cep }),
      ...(state && state.trim() !== "" && { state }),
      ...(neighborhood && neighborhood.trim() !== "" && { neighborhood }),
      ...(street && street.trim() !== "" && { street }),
      ...(number && number.trim() !== "" && { number }),
      ...(complement && complement.trim() !== "" && { complement }),
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

  // CEP auto-fill effect
  useEffect(() => {
    if (locationData && locationData.state) {
      setFilledByCep(true);
      setSelectedState(locationData.state);
      form.clearErrors("cep");

      const filled = new Set<string>();
      if (locationData.state) filled.add("state");
      if (locationData.city) filled.add("city");
      if (locationData.neighborhood) filled.add("neighborhood");
      if (locationData.street) filled.add("street");
      setCepFilledFields(filled);

      form.setValue("state", locationData.state ?? "");
      form.setValue("city", locationData.city ?? "");
      form.setValue("neighborhood", locationData.neighborhood ?? "");
      form.setValue("street", locationData.street ?? "");
    }
  }, [locationData, form]);

  // CEP error effect
  useEffect(() => {
    if (cepError) {
      setFilledByCep(false);
      setCepFilledFields(new Set());
      setSelectedState("");
      toast.error(t.cep.fetchError, {
        description: t.cep.verifyMessage,
        duration: 5000,
      });
      form.setError("cep", {
        type: "manual",
        message: t.cep.verifyMessage,
      });
      form.setValue("state", "");
      form.setValue("city", "");
    }
  }, [cepError, form, t]);

  // Clear member-only fields when switching to company
  useEffect(() => {
    if (isCompany) {
      form.setValue("crea_cau", "");
      form.setValue("birthdate", "");
      form.setValue("activity", "");
      form.setValue("enterprise", "");
    } else {
      form.setValue("cnpj", "");
    }
  }, [isCompany, form]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {t.auth.signUp.name}
        </h1>
        <p className="text-muted-foreground">{t.auth.signUp.signUpButton}</p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(() => setWarnModalIsOpen(true))}
            >
              {/* Type selector */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.signUp.accountType}</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => field.onChange("member")}
                          className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                            field.value === "member"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <User
                            className={`h-5 w-5 ${field.value === "member" ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <div className="text-left">
                            <p
                              className={`font-medium text-sm ${field.value === "member" ? "text-primary" : "text-foreground"}`}
                            >
                              {t.auth.signUp.individual}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.auth.signUp.individualDescription}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("company")}
                          className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                            field.value === "company"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <Building2
                            className={`h-5 w-5 ${field.value === "company" ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <div className="text-left">
                            <p
                              className={`font-medium text-sm ${field.value === "company" ? "text-primary" : "text-foreground"}`}
                            >
                              {t.auth.signUp.company}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.auth.signUp.companyDescription}
                            </p>
                          </div>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Divider className="bg-accent-foreground/10" />
              <p className="font-bold text-lg">
                {isCompany ? t.auth.signUp.companyInfo : t.auth.signUp.personalInfo}
              </p>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1.5">
                      <FormLabel>
                        {isCompany ? t.auth.signUp.nameLabelCompany : t.auth.signUp.nameLabel}
                      </FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {isCompany
                                ? t.auth.signUp.nameTooltipCompany
                                : t.auth.signUp.nameTooltipMember}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        placeholder={isCompany ? t.auth.signUp.razaoSocial : t.auth.signUp.name}
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
                      <FormLabel>{t.auth.signUp.emailLabel}</FormLabel>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger type="button">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t.auth.signUp.emailTooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t.auth.signUp.emailPlaceholder}
                        disabled={isPending}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CNPJ — company only */}
              {isCompany && (
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-1.5">
                        <FormLabel>{t.auth.signUp.cnpjLabel}</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t.auth.signUp.cnpjTooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder={t.auth.signUp.cnpjPlaceholder}
                          disabled={isPending}
                          autoComplete="none"
                          value={masks.cnpj(field.value || "")}
                          onChange={(e) =>
                            field.onChange(masks.cnpj(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Member-only fields: CREA/CAU, birthdate, city */}
              {!isCompany && (
                <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                  <FormField
                    control={form.control}
                    name="crea_cau"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5">
                          <FormLabel>{t.auth.signUp.creaLabel}</FormLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.auth.signUp.creaTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder={t.auth.signUp.creaPlaceholder}
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
                          <FormLabel>{t.auth.signUp.birthDateLabel}</FormLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.auth.signUp.birthDateTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder={t.auth.signUp.birthDatePlaceholder}
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
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.auth.signUp.passwordLabel}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t.auth.signUp.passwordPlaceholder}
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
                      <FormLabel>{t.auth.signUp.confirmPasswordLabel}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t.auth.signUp.confirmPasswordPlaceholder}
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

              {/* Member-only professional section */}
              {!isCompany && (
                <>
                  <Divider className="bg-accent-foreground/10" />
                  <p className="font-bold text-lg">{t.auth.signUp.professionalInfo}</p>
                  <FormField
                    control={form.control}
                    name="activity"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5">
                          <FormLabel>{t.auth.signUp.activityLabel}</FormLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.auth.signUp.activityTooltip}</p>
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
                            <SelectTrigger
                              className="w-full"
                              disabled={isPending}
                            >
                              <SelectValue placeholder={t.auth.signUp.activityPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arquitetura">
                                {t.auth.signUp.activityArchitecture}
                              </SelectItem>
                              <SelectItem value="Engenharia Civil">
                                {t.auth.signUp.activityCivilEngineering}
                              </SelectItem>
                              <SelectItem value="Coordenação de Projetos">
                                {t.auth.signUp.activityProjectCoordination}
                              </SelectItem>
                              <SelectItem value="Pesquisador(a)">
                                {t.auth.signUp.activityResearch}
                              </SelectItem>
                              <SelectItem value="Outro">{t.auth.signUp.activityOther}</SelectItem>
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
                          <FormLabel>{t.auth.signUp.companyNameLabel}</FormLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.auth.signUp.companyNameTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder={t.auth.signUp.companyNamePlaceholder}
                            disabled={isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Address section */}
              <Divider className="bg-accent-foreground/10" />
              <p className="font-bold text-lg">{t.auth.signUp.addressSection}</p>

              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.signUp.cepLabel}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="00000-000"
                          disabled={isPending}
                          value={masks.cep(field.value || "")}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            field.onChange(e.target.value);
                            if (raw.length === 0 && filledByCep) {
                              setFilledByCep(false);
                              setCepFilledFields(new Set());
                              setSelectedState("");
                              form.setValue("state", "");
                              form.setValue("city", "");
                              form.setValue("neighborhood", "");
                              form.setValue("street", "");
                            }
                            if (e.target.value.length > 8)
                              searchCep(e.target.value);
                          }}
                        />
                        {locationLoading && (
                          <div className="h-4 w-4 animate-spin rounded-full border-1 border-primary border-t-transparent" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.auth.signUp.stateLabel}</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedState(value);
                            if (!filledByCep) {
                              form.setValue("city", "");
                            }
                          }}
                          value={field.value}
                          disabled={filledByCep || locationLoading || isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t.auth.signUp.statePlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem
                                key={state.label}
                                value={state.value.toUpperCase()}
                              >
                                {state.label} - {state.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{t.auth.signUp.cityLabel}</FormLabel>
                      <FormControl>
                        {filledByCep ? (
                          <Input placeholder={t.auth.signUp.cityPlaceholder} disabled {...field} />
                        ) : (
                          <CityCombobox
                            cities={cities}
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={
                              !selectedState || locationLoading || isPending
                            }
                            isLoading={citiesLoading}
                            isError={citiesError}
                            placeholder={
                              !selectedState
                                ? t.auth.signUp.citySelectFirst
                                : t.auth.signUp.citySelect
                            }
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.signUp.neighborhoodLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.auth.signUp.neighborhoodPlaceholder}
                        disabled={
                          cepFilledFields.has("neighborhood") ||
                          locationLoading ||
                          isPending
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{t.auth.signUp.streetLabel}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.auth.signUp.streetPlaceholder}
                          disabled={
                            cepFilledFields.has("street") ||
                            locationLoading ||
                            isPending
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.auth.signUp.numberLabel}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.auth.signUp.numberPlaceholder}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem className="@md:col-span-2">
                      <FormLabel>{t.auth.signUp.complementLabel}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.auth.signUp.complementPlaceholder}
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          {t.auth.signUp.privacyAccept}{" "}
                          <CustomLink
                            linkKey="privacy"
                            className="underline text-active hover:text-active-50 underline-offset-2 transition-all"
                          >
                            {t.auth.signUp.privacyLink}
                          </CustomLink>
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
                          {t.auth.signUp.termsAccept}{" "}
                          <CustomLink
                            linkKey="termsOfUse"
                            className="underline text-active hover:text-active-50 underline-offset-2 transition-all"
                          >
                            {t.auth.signUp.termsLink}
                          </CustomLink>{" "}
                          {t.auth.signUp.termsSuffix}
                        </span>
                      </div>
                      <FormMessage className="ml-6" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-active/20 bg-active/5 px-4 py-3 text-sm">
                <ShieldCheck className="h-5 w-5 shrink-0 text-active" />
                <span className="text-muted-foreground">
                  {t.auth.signUp.dataManagement}{" "}
                  <CustomLink
                    linkKey="dataForm"
                    className="font-medium text-active hover:text-active-50 underline underline-offset-2 transition-all"
                  >
                    {t.auth.signUp.dataRights}
                  </CustomLink>
                </span>
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
                    {t.common.loading}
                  </>
                ) : (
                  t.auth.signUp.signUpButton
                )}
              </Button>
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
