import { patchUser, UpdateUserParams } from "@/actions/users/patchUser";
import { Button } from "@/components/ui/button";
import { CityCombobox } from "@/components/ui/city-combobox";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import useCities from "@/hooks/useCities";
import { useIsMobile } from "@/hooks/useIsMobile";
import useCep from "@/hooks/useLocation";
import { cn } from "@/lib/utils";
import { dateUtils } from "@/utils/date";
import { masks } from "@/utils/masks";
import { states } from "@/utils/states";
import {
  UpdateUserFormSchema,
  updateUserFormSchema,
} from "@/validators/updateUserForm.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { CustomLink } from "@/components/ui/custom-link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface DrawerFormUserProps {
  componentTrigger: React.ReactNode;
}

export default function DrawerFormUser({
  componentTrigger,
}: DrawerFormUserProps) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [filledByCep, setFilledByCep] = useState(false);
  const [cepFilledFields, setCepFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [selectedState, setSelectedState] = useState("");

  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();

  // Extrai os dados do usuário corretamente (pode estar aninhado)
  const userData = (user as any)?.user || user;
  const userType: "member" | "company" = userData?.type || "member";
  const isCompany = userType === "company";

  const form = useForm<UpdateUserFormSchema>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      name: userData?.name || "",
      email: userData?.email || "",
      password: "",
      confirmPassword: "",
      cnpj: userData?.cnpj || "",
      crea_cau: userData?.crea_cau || "",
      birthdate: userData?.birthdate
        ? new Date(userData.birthdate).toLocaleDateString("pt-BR")
        : "",
      city: userData?.city || "",
      activity: userData?.activity || "",
      enterprise: userData?.enterprise || "",
      cep: userData?.cep || "",
      state: userData?.state || "",
      neighborhood: userData?.neighborhood || "",
      street: userData?.street || "",
      number: userData?.number || "",
      complement: userData?.complement || "",
    },
  });

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

  const {
    isPending: isUpdatePending,
    mutate: mutateUpdate,
    reset: resetUpdate,
  } = useMutation({
    mutationFn: (data: UpdateUserParams) => patchUser(data),
    onError: (error: any) => {
      if (error.response?.status === 409) {
        form.setError("email", {
          type: "custom",
          message: "E-mail já cadastrado",
        });
      }
      toast.error("Erro ao atualizar usuário", {
        description: error.message || "Não foi possível atualizar os dados",
        duration: 5000,
      });
    },
    onSuccess: (response) => {
      // Update user in context with the response data
      // A resposta da API pode vir como response.data ou response.data.user
      if (response?.data) {
        // Se a resposta tem user dentro, usa ele, senão usa data diretamente
        const apiUserData = response.data.user || response.data;

        // Se os dados do usuário estavam aninhados, mantenha aninhados
        let updatedUser;
        if ((user as any)?.user) {
          // Estrutura aninhada: { user: { ...dados } }
          updatedUser = {
            user: {
              ...userData,
              ...apiUserData,
            },
          };
        } else {
          // Estrutura plana: { ...dados }
          updatedUser = {
            ...userData,
            ...apiUserData,
          };
        }

        // Atualiza o contexto primeiro
        refreshUser(updatedUser);

        // Então invalida queries para forçar recarregamento em outros componentes
        queryClient.invalidateQueries({
          queryKey: ["user"],
        });

        // Fecha o drawer após um pequeno delay para garantir que o contexto foi atualizado
        setTimeout(() => {
          setOpenDrawer(false);
          form.reset();
        }, 100);
      } else {
        setOpenDrawer(false);
        form.reset();
      }

      toast.success("Usuário atualizado com sucesso", {
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: UpdateUserFormSchema) => {
    const updateData: UpdateUserParams = {
      name: data.name,
    };

    // Only include password if it was provided
    if (data.password && data.password.trim() !== "") {
      updateData.password = data.password;
    }

    // Convert birthdate from DD/MM/YYYY to ISO format if provided
    if (data.birthdate && data.birthdate.trim() !== "") {
      const cleanDate = data.birthdate.replace(/\D/g, "");
      const day = cleanDate.substring(0, 2);
      const month = cleanDate.substring(2, 4);
      const year = cleanDate.substring(4, 8);
      updateData.birthdate = `${year}-${month}-${day}T00:00:00Z`;
    }

    // Add optional fields based on type
    if (!isCompany) {
      if (data.crea_cau && data.crea_cau.trim() !== "")
        updateData.crea_cau = data.crea_cau;
      if (data.activity && data.activity.trim() !== "")
        updateData.activity = data.activity;
      if (data.enterprise && data.enterprise.trim() !== "")
        updateData.enterprise = data.enterprise;
    } else {
      if (data.cnpj && data.cnpj.trim() !== "")
        updateData.cnpj = data.cnpj.replace(/\D/g, "");
    }

    if (data.city && data.city.trim() !== "") updateData.city = data.city;

    // Address fields
    if (data.cep && data.cep.trim() !== "") updateData.cep = data.cep;
    if (data.state && data.state.trim() !== "") updateData.state = data.state;
    if (data.neighborhood && data.neighborhood.trim() !== "")
      updateData.neighborhood = data.neighborhood;
    if (data.street && data.street.trim() !== "")
      updateData.street = data.street;
    if (data.number && data.number.trim() !== "")
      updateData.number = data.number;
    if (data.complement && data.complement.trim() !== "")
      updateData.complement = data.complement;

    mutateUpdate(updateData);
  };

  useEffect(() => {
    if (openDrawer && userData) {
      resetUpdate();
      setFilledByCep(false);
      setCepFilledFields(new Set());
      setSelectedState(userData.state || "");

      // Format birthdate for display if it exists
      let formattedBirthdate = "";
      if (userData.birthdate) {
        const date = dateUtils.ignoreTimezone(new Date(userData.birthdate));
        formattedBirthdate = date.toLocaleDateString("pt-BR");
      }

      form.reset({
        name: userData.name || "",
        email: userData.email || "",
        password: "",
        confirmPassword: "",
        cnpj: userData.cnpj || "",
        crea_cau: userData.crea_cau || "",
        birthdate: formattedBirthdate,
        city: userData.city || "",
        activity: userData.activity || "",
        enterprise: userData.enterprise || "",
        cep: userData.cep || "",
        state: userData.state || "",
        neighborhood: userData.neighborhood || "",
        street: userData.street || "",
        number: userData.number || "",
        complement: userData.complement || "",
      });
    }
  }, [openDrawer, userData, form, resetUpdate]);

  // Atualiza o formulário quando os dados do usuário mudam (após salvar)
  useEffect(() => {
    if (userData && !openDrawer) {
      let formattedBirthdate = "";
      if (userData.birthdate) {
        const date = new Date(userData.birthdate);
        formattedBirthdate = date.toLocaleDateString("pt-BR");
      }

      form.reset({
        name: userData.name || "",
        email: userData.email || "",
        password: "",
        confirmPassword: "",
        cnpj: userData.cnpj || "",
        crea_cau: userData.crea_cau || "",
        birthdate: formattedBirthdate,
        city: userData.city || "",
        activity: userData.activity || "",
        enterprise: userData.enterprise || "",
        cep: userData.cep || "",
        state: userData.state || "",
        neighborhood: userData.neighborhood || "",
        street: userData.street || "",
        number: userData.number || "",
        complement: userData.complement || "",
      });
    }
  }, [userData]);

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
      toast.error(t("error.errorFetchZipCode"), {
        description: t("warn.verifyZipCode"),
        duration: 5000,
      });
      form.setError("cep", {
        type: "manual",
        message: t("warn.verifyZipCode"),
      });
      form.setValue("state", "");
      form.setValue("city", "");
    }
  }, [cepError, form, t]);

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={openDrawer}
      dismissible={false}
    >
      <DrawerTrigger
        asChild
        onClick={(e) => {
          e.stopPropagation();
          setOpenDrawer(true);
        }}
      >
        {componentTrigger}
      </DrawerTrigger>
      <DrawerContent
        className={cn("min-w-2/5", {
          "w-full h-4/5": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle>Editar Dados da Conta</DrawerTitle>
          <Button
            onClick={() => setOpenDrawer(false)}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <Form {...form}>
          <div className="@container max-h-[calc(100vh-100px)] overflow-y-auto px-8">
            <form
              id="user-form"
              className="flex flex-col gap-3 rounded-md px-4 py-2 border-gray-shade-200 border bg-card"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 mb-1">
                {isCompany ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isCompany ? "Pessoa Jurídica" : "Pessoa Física"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O tipo de conta não pode ser alterado
                  </p>
                </div>
              </div>

              <p className="font-bold text-lg">
                {isCompany ? "Informações da empresa" : "Informações pessoais"}
              </p>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isCompany ? "Razão Social" : t("signUp.name")} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          isCompany ? "Razão Social" : t("signUp.name")
                        }
                        disabled={isUpdatePending}
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
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="exemplo@email.com"
                        disabled={true}
                        autoComplete="email"
                        className="bg-muted/50 cursor-not-allowed"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      O e-mail não pode ser alterado
                    </p>
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
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="00.000.000/0000-00"
                          disabled={isUpdatePending}
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

              {/* Member-only fields: CREA/CAU, birthdate */}
              {!isCompany && (
                <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                  <FormField
                    control={form.control}
                    name="crea_cau"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registro CREA/CAU</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="26.2024.9999999"
                            disabled={isUpdatePending}
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
                        <FormLabel>{t("signUp.birthDate")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="DD/MM/AAAA"
                            disabled={isUpdatePending}
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

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Alterar senha:</strong> Preencha os campos abaixo
                  apenas se desejar alterar sua senha. Deixe em branco para
                  manter a senha atual.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Nova senha (opcional)"
                            disabled={isUpdatePending}
                            autoComplete="new-password"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            disabled={isUpdatePending}
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
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirmar nova senha"
                            disabled={isUpdatePending}
                            autoComplete="new-password"
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            disabled={isUpdatePending}
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
                  <p className="font-bold text-lg mt-4">
                    Informações profissionais
                  </p>
                  <FormField
                    control={form.control}
                    name="activity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("signUp.activityArea")}</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <SelectTrigger
                              className="w-full"
                              disabled={isUpdatePending}
                            >
                              <SelectValue
                                placeholder={t("signUp.activityArea")}
                              />
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
                                Pesquisador(a)
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
                        <FormLabel>{t("signUp.companyName")}</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder={t("signUp.companyName")}
                            disabled={isUpdatePending}
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
              <p className="font-bold text-lg mt-4">Endereço</p>

              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="00000-000"
                          disabled={isUpdatePending}
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
                              form.setValue("complement", "");
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

              <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
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
                          disabled={
                            filledByCep || locationLoading || isUpdatePending
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o estado" />
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
                    <FormItem className="@md:col-span-2">
                      <FormLabel>{t("signUp.city")}</FormLabel>
                      <FormControl>
                        {filledByCep ? (
                          <Input placeholder="Cidade" disabled {...field} />
                        ) : (
                          <CityCombobox
                            cities={cities}
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={
                              !selectedState ||
                              locationLoading ||
                              isUpdatePending
                            }
                            isLoading={citiesLoading}
                            isError={citiesError}
                            placeholder={
                              !selectedState
                                ? "Selecione o estado primeiro"
                                : "Selecione a cidade"
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
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Bairro"
                        disabled={
                          cepFilledFields.has("neighborhood") ||
                          locationLoading ||
                          isUpdatePending
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="@md:col-span-2">
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua"
                          disabled={
                            cepFilledFields.has("street") ||
                            locationLoading ||
                            isUpdatePending
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
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nº"
                          disabled={isUpdatePending}
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
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Complemento"
                          disabled={isUpdatePending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </div>
        </Form>
        <DrawerFooter className="px-8 py-4">
          <Button
            disabled={isUpdatePending}
            type="submit"
            form="user-form"
            variant="bipc"
          >
            {isUpdatePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
          <div className="flex items-center gap-2 rounded-md border border-active/20 bg-active/5 px-4 py-3 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-active" />
            <span className="text-muted-foreground">
              Gerencie seus dados pessoais.{" "}
              <CustomLink
                linkKey="dataForm"
                className="font-medium text-active hover:text-active-50 underline underline-offset-2 transition-all"
              >
                Exercer meus direitos
              </CustomLink>
            </span>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
