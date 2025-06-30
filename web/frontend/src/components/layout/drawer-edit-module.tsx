/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  addModuleFormSchema,
  AddModuleFormSchema,
  DEFAULT_VALUES,
} from "@/validators/addModule.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
// import { toast } from 'sonner'
import { TModuleData } from "@/types/projects";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

interface IDrawerEditProject {
  componentTrigger: React.ReactNode;
  callback?: (data: TModuleData) => void;
  curModule?: Pick<TModuleData, "tipoDeEstrutura">;
  context?: string;
  module: TModuleData;
}

export default function DrawerEditModule({
  componentTrigger,
  callback,
  curModule,
  context,
  module,
}: IDrawerEditProject) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false); // Estado para controlar o Drawer
  const form = useForm<AddModuleFormSchema>({
    resolver: zodResolver(addModuleFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = (data: AddModuleFormSchema) => {
    // toast.error('Funcionalidade ainda não integrada')
    if (callback) {
      callback({
        ...data,
        module_uuid: module.module_uuid,
      } as TModuleData);
      setIsOpen(false);
      form.reset();
    }
  };

  useEffect(() => {
    if (curModule) {
      form.setValue("tipoDeEstrutura", curModule.tipoDeEstrutura);
    }
  }, [curModule, form, t]);

  useEffect(() => {
    if (module) {
      Object.keys(module).forEach((key) => {
        if (key in DEFAULT_VALUES) {
          const value = module[key as keyof TModuleData];
          if (value !== undefined && value !== null) {
            form.setValue(
              key as keyof AddModuleFormSchema,
              value as AddModuleFormSchema[keyof AddModuleFormSchema]
            );
          }
        }
      });
    }
  }, [module, form]);
  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger>{componentTrigger}</DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <div className="mx-auto w-full p-8">
          <DrawerHeader>
            <DrawerTitle>{t("drawerEditModule.title")}</DrawerTitle>
            <Button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-2"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>
          <Form {...form}>
            {/* Botão de Enviar */}

            <form
              className="flex max-h-[calc(100vh-100px)] flex-col gap-3 overflow-y-auto p-8"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="flex items-center justify-center">
                <Button type="submit" variant="noStyles" className="w-full">
                  {context === "simulation"
                    ? t("drawerEditModule.saveSimulation")
                    : t("drawerEditModule.saveModule")}
                </Button>
              </div>

              {/* Tipo de Estrutura */}
              <FormField
                control={form.control}
                name="tipoDeEstrutura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerEditModule.structureTypeLabel")}
                    </FormLabel>
                    <FormControl className="w-full">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!curModule}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "drawerEditModule.structureTypePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={"beamColumn"}>
                            {t("common.structureType.beamColumn")}
                          </SelectItem>
                          <SelectItem value={"concreteWall"}>
                            {t("common.structureType.concreteWall")}
                          </SelectItem>
                          <SelectItem value={"masonry"}>
                            {t("common.structureType.masonry")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de Edificação */}
              <FormField
                control={form.control}
                name="tipoDeEdificacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerEditModule.buildingTypeLabel")}
                    </FormLabel>
                    <FormControl className="w-full">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              "drawerEditModule.buildingTypePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">
                            Residencial
                          </SelectItem>
                          <SelectItem value="mixed">Misto</SelectItem>
                          <SelectItem value="corporate">Corporativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campos numéricos em duas colunas */}
              <FormField
                control={form.control}
                name="numeroDeTorres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("drawerEditModule.repeatedUnitLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <section className="my-4 flex w-full flex-col gap-2">
                <p className="block w-full flex-1">
                  {t("drawerEditModule.floorsNumberLabel")}
                </p>
                <div className="grid grid-cols-2 items-end gap-4 pl-2">
                  <FormField
                    control={form.control}
                    name="pavimentosSemFundacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerEditModule.totalLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pavimentosTotalDaTorre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerEditModule.towerLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pavimentosDoEmbasamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerEditModule.basementLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numeroDeSubsolos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("drawerEditModule.basementNumberLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>
              {/* Numero de Subsolos */}
              <div className="grid grid-cols-2 items-end gap-4">
                {/* Área Construída Total */}
                <FormField
                  control={form.control}
                  name="areaConstruidaTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.totalBuiltAreaLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Altura do Piso a Piso do Tipo */}
                <FormField
                  control={form.control}
                  name="alturaPisoAPisoTipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.floorHeightLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Maior Altura do Piso a Piso Existente */}
                <FormField
                  control={form.control}
                  name="maiorPisoAPisoExistente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.maxFloorHeightLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Espessura de Paredes */}
                <FormField
                  control={form.control}
                  name="espessuraDeParedes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.wallThicknessLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Espessura de Lajes */}
                <FormField
                  control={form.control}
                  name="espessuraDeLajes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.slabThicknessLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck20 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck20"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck20Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck25 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck25Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck30 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck30"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck30Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck35 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck35"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck35Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck40 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck40"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck40Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Volume de Concreto Fck45 */}
                <FormField
                  control={form.control}
                  name="volumeDeConcretoFck45"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.concreteVolumeFck45Label")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Consumo de aço */}
                <FormField
                  control={form.control}
                  name="consumoDeAco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("drawerEditModule.steelConsumptionLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-center">
                <Button type="submit" variant="noStyles" className="w-full">
                  {context === "simulation"
                    ? t("drawerEditModule.saveSimulation")
                    : t("drawerEditModule.saveModule")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
