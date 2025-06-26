/* eslint-disable @typescript-eslint/no-misused-promises */
import { TModuleData } from "@/types/projects";
import {
  addModuleFormSchema,
  AddModuleFormSchema,
  DEFAULT_VALUES,
} from "@/validators/addModule.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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

interface IDrawerAddProject {
  componentTrigger: React.ReactNode;
  callback?: (data: AddModuleFormSchema) => void;
  curModule?: Pick<TModuleData, "tipoDeEstrutura">;
  context?: string;
}

export default function DrawerAddModule({
  componentTrigger,
  callback,
  curModule,
  context,
}: IDrawerAddProject) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<AddModuleFormSchema>({
    resolver: zodResolver(addModuleFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = (data: AddModuleFormSchema) => {
    // toast.error(t('drawerAddModule.featureNotIntegrated'))
    if (callback) {
      callback({ ...data, created_at: new Date().toISOString() });
      setIsOpen(false);
      form.reset();
    }
  };

  useEffect(() => {
    if (curModule) {
      form.setValue("tipoDeEstrutura", curModule.tipoDeEstrutura);
    }
  }, [curModule, form, t]);

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <div onClick={() => setIsOpen(true)}>{componentTrigger}</div>
      </DrawerTrigger>
      <DrawerContent className="min-w-2/5">
        <DrawerHeader className="px-6">
          <DrawerTitle>
            {context === "simulation"
              ? t("simulations.addSimulation")
              : t("common.constructiveTechnology")}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription className="px-6">
          {t("drawerAddModule.description")}
        </DrawerDescription>
        <Form {...form}>
          {/* Botão de Enviar */}

          <form
            className="flex max-h-[calc(100vh-100px)] flex-col gap-3 overflow-y-auto p-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="flex items-center justify-center">
              <Button type="submit" variant="noStyles" className="w-full">
                {context === "simulation"
                  ? t("simulations.addSimulation")
                  : t("drawerAddModule.addConstructiveTechnology")}
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
                      defaultValue={field.value}
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
                        <SelectItem value="beamColumn">
                          {t("common.structureType.beamColumn")}
                        </SelectItem>
                        <SelectItem value="concreteWall">
                          {t("common.structureType.concreteWall")}
                        </SelectItem>
                        <SelectItem value="masonry">
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
                          {t("common.buildingType.residential")}
                        </SelectItem>
                        <SelectItem value="mixed">
                          {t("common.buildingType.mixed")}
                        </SelectItem>
                        <SelectItem value="corporate">
                          {t("common.buildingType.corporate")}
                        </SelectItem>
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
                  <FormLabel>{t("drawerAddModule.repeatUnit")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <section className="my-4 flex w-full flex-col gap-2">
              <p className="block w-full flex-1">
                {t("drawerAddModule.numberOfFloors")}
              </p>
              <div className="grid grid-cols-2 items-end gap-4 pl-2">
                <FormField
                  control={form.control}
                  name="pavimentosSemFundacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("drawerAddModule.total")}</FormLabel>
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
                      <FormLabel>{t("drawerAddModule.tower")}</FormLabel>
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
                      <FormLabel>{t("drawerAddModule.basement")}</FormLabel>
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
                        {t("drawerAddModule.basementNumber")}
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
                    <FormLabel>{t("drawerAddModule.totalBuiltArea")}</FormLabel>
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
                      {t("drawerAddModule.floorToFloorHeight")}
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
                      {t("drawerAddModule.maxFloorToFloorHeight")}
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
                    <FormLabel>{t("drawerAddModule.wallThickness")}</FormLabel>
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
                    <FormLabel>{t("drawerAddModule.slabThickness")}</FormLabel>
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
                      {t("drawerAddModule.concreteVolumeFck20")}
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
                      {t("drawerAddModule.concreteVolumeFck25")}
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
                      {t("drawerAddModule.concreteVolumeFck30")}
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
                      {t("drawerAddModule.concreteVolumeFck35")}
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
                      {t("drawerAddModule.concreteVolumeFck40")}
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
                      {t("drawerAddModule.concreteVolumeFck45")}
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
                      {t("drawerAddModule.steelConsumption")}
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
                  ? t("simulations.addSimulation")
                  : t("drawerAddModule.addConstructiveTechnology")}
              </Button>
            </div>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
