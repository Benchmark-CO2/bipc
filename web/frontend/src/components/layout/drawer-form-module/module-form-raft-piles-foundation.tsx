import { masks } from "@/utils/masks";
import { ModuleFormInput } from "@/validators/moduleFormByType.validator";
import { useLayoutEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "../../ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import SteelMaterialList from "./steel-material-list";

interface ModuleFormRaftPilesFoundationProps {
  form: UseFormReturn<ModuleFormInput>;
}

const ModuleFormRaftPilesFoundation = ({
  form,
}: ModuleFormRaftPilesFoundationProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const [customFck, setCustomFck] = useState(false);

  const currentFck = form.watch("fck");
  const isCustomFck =
    customFck || (currentFck && !fckOptions.includes(currentFck));

  // Detectar fck customizado ao carregar dados de edição (antes do render)
  useLayoutEffect(() => {
    if (currentFck && !fckOptions.includes(currentFck)) {
      setCustomFck(true);
    }
  }, [currentFck]);

  return (
    <div className="space-y-4">
      {/* fck Único para Radier e Estacas */}
      <div
        className={`grid gap-4 ${isCustomFck ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <FormField
          control={form.control}
          name="fck"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">fck do concreto (MPa) *</FormLabel>
              <FormControl>
                <Select
                  onValueChange={(value) => {
                    // Ignorar valores vazios (onChange automático do Select)
                    if (!value || value === "") {
                      return;
                    }

                    if (value === "other") {
                      setCustomFck(true);
                      // Manter o valor atual se já for customizado, senão usar 70
                      if (!currentFck || fckOptions.includes(currentFck)) {
                        field.onChange(70);
                      }
                    } else {
                      setCustomFck(false);
                      field.onChange(Number(value));
                    }
                  }}
                  value={(() => {
                    if (field.value && !fckOptions.includes(field.value)) {
                      return "other";
                    } else if (
                      field.value &&
                      fckOptions.includes(field.value)
                    ) {
                      return field.value.toString();
                    }
                    return "";
                  })()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione fck" />
                  </SelectTrigger>
                  <SelectContent>
                    {fckOptions.map((fck) => (
                      <SelectItem key={fck} value={fck.toString()}>
                        {fck}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        {isCustomFck && (
          <FormField
            control={form.control}
            name="fck"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Outro fck (MPa)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="70"
                    {...field}
                    value={field.value?.toString() || ""}
                    onChange={(e) =>
                      field.onChange(Number(masks.numeric(e.target.value)) || 0)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Radier */}
      <h3 className="text-base font-semibold text-primary">Radier</h3>
      <Card className="border-2 border-blue-500">
        <CardContent className="space-y-4 pt-4">
          {/* Área e Espessura do Radier */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="raft.area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Área (m²) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="raft.thickness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Espessura (m) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="0,00"
                      onChange={(e) => {
                        const maskedValue = masks.numeric(e.target.value);
                        field.onChange(maskedValue);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Aço do Radier */}
          <SteelMaterialList
            form={form}
            name="raft.steel"
            allowedMaterials={["rebar", "mesh", "strand", "other"]}
          />
        </CardContent>
      </Card>

      {/* Estacas */}
      <h3 className="text-base font-semibold text-primary">Estacas</h3>
      <Card className="border-2 border-blue-500">
        <CardContent className="space-y-4 pt-4">
          {/* Volume das Estacas */}
          <FormField
            control={form.control}
            name="piles.volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Volume de concreto (m³)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="0,00"
                    onChange={(e) => {
                      const maskedValue = masks.numeric(e.target.value);
                      field.onChange(maskedValue);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Aço das Estacas */}
          <SteelMaterialList form={form} name="piles.steel" />
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleFormRaftPilesFoundation;
