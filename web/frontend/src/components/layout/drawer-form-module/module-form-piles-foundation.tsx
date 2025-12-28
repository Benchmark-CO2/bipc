import { masks } from "@/utils/masks";
import { ModuleFormInput } from "@/validators/moduleFormByType.validator";
import { useEffect, useLayoutEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "../../ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ModuleFormPilesFoundationProps {
  form: UseFormReturn<ModuleFormInput>;
}

const ModuleFormPilesFoundation = ({
  form,
}: ModuleFormPilesFoundationProps) => {
  const fckOptions = [20, 25, 30, 35, 40, 45];
  const [customFck, setCustomFck] = useState(false);

  const currentFck = form.watch("fck");
  const isCustomFck =
    customFck || (currentFck && !fckOptions.includes(currentFck));

  // Detectar FCK customizado ao carregar dados de edição (antes do render)
  useLayoutEffect(() => {
    if (currentFck && !fckOptions.includes(currentFck)) {
      setCustomFck(true);
    }
  }, [currentFck]);

  return (
    <div className="space-y-4">
      {/* FCK */}
      <div
        className={`grid gap-4 ${isCustomFck ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <FormField
          control={form.control}
          name="fck"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">FCK do concreto (MPa) *</FormLabel>
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
                    <SelectValue placeholder="Selecione FCK" />
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
              <FormMessage />
            </FormItem>
          )}
        />

        {isCustomFck && (
          <FormField
            control={form.control}
            name="fck"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Outro FCK (MPa)</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Estacas */}
      <h3 className="text-sm font-medium text-gray-900">Estacas</h3>
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Aço das Estacas */}
          <div className="space-y-3">
            <FormLabel className="text-xs text-gray-700">Aço</FormLabel>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="piles.steel.ca50"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA50 (kg)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="piles.steel.ca60"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA60 (kg)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mesoestrutura (Blocos de Coroamento) */}
      <h3 className="text-sm font-medium text-gray-900">
        Mesoestrutura (Blocos, Vigas Baldrame, Cintas)
      </h3>
      <Card className="border-2 border-blue-500">
        <CardContent className="space-y-4 pt-4">
          {/* Volume da Mesoestrutura */}
          <FormField
            control={form.control}
            name="cap_beams.volume"
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Aço da Mesoestrutura */}
          <div className="space-y-3">
            <FormLabel className="text-xs text-gray-700">Aço</FormLabel>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cap_beams.steel.ca50"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA50 (kg)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cap_beams.steel.ca60"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">CA60 (kg)</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleFormPilesFoundation;
