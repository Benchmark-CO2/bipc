import { masks } from "@/utils/masks";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../../ui/button";
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

type MaterialKey = "rebar" | "mesh" | "strand" | "other";

const allMaterialOptions: Record<MaterialKey, string> = {
  rebar: "Vergalhão",
  mesh: "Tela",
  strand: "Cordoalha",
  other: "Outro",
};

const defaultResistanceByMaterial: Record<string, string> = {
  rebar: "CA50",
  mesh: "CA60",
  strand: "CP190",
  other: "CA50",
};

interface SteelMaterialListProps {
  form: UseFormReturn<any>;
  name: string;
  allowedMaterials?: MaterialKey[];
}

interface SteelMaterialItemProps {
  form: UseFormReturn<any>;
  name: string;
  index: number;
  fieldId: string;
  materialOptions: Array<{ value: string; label: string }>;
  resistanceOptions: Array<{ value: string; label: string }>;
  usedMaterials: string[];
  usedResistances: string[];
  onRemove: () => void;
  canRemove: boolean;
}

// Componente separado para cada item do array - evita violação das regras dos Hooks
const SteelMaterialItem = ({
  form,
  name,
  index,
  fieldId,
  materialOptions,
  resistanceOptions,
  usedMaterials,
  usedResistances,
  onRemove,
  canRemove,
}: SteelMaterialItemProps) => {
  // Agora useWatch está no nível correto do componente
  const currentMaterial = useWatch({
    control: form.control,
    name: `${name}.${index}.material`,
  });
  const currentResistance = useWatch({
    control: form.control,
    name: `${name}.${index}.resistance`,
  });

  // Filtrar opções de resistência de acordo com o material selecionado
  const allowedResistancesByMaterial: Record<string, string[]> = {
    rebar: ["CA50", "CA60", "other"],
    mesh: ["CA60", "other"],
    strand: ["CP190", "other"],
    other: ["CA50", "CA60", "CP190", "other"],
  };
  const allowedResistances =
    allowedResistancesByMaterial[currentMaterial] ??
    resistanceOptions.map((o) => o.value);
  const filteredResistanceOptions = resistanceOptions.filter((opt) =>
    allowedResistances.includes(opt.value),
  );

  // Resetar resistência quando o material muda e o valor atual não é mais válido
  useEffect(() => {
    if (currentResistance && !allowedResistances.includes(currentResistance)) {
      form.setValue(
        `${name}.${index}.resistance`,
        filteredResistanceOptions[0]?.value ?? "CA50",
      );
    }
  }, [currentMaterial]);

  return (
    <div
      key={fieldId}
      className="border border-gray-200 rounded-md p-3 space-y-3"
    >
      <div className="grid grid-cols-12 gap-2">
        {/* Material */}
        <div className="col-span-4">
          <FormField
            control={form.control}
            name={`${name}.${index}.material`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">Material *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={
                            usedMaterials.includes(opt.value) &&
                            currentMaterial !== opt.value
                          }
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Resistência */}
        <div className="col-span-3">
          <FormField
            control={form.control}
            name={`${name}.${index}.resistance`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">Tipo *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredResistanceOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={
                            usedResistances.includes(opt.value) &&
                            currentResistance !== opt.value
                          }
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Massa */}
        <div className="col-span-4">
          <FormField
            control={form.control}
            name={`${name}.${index}.mass`}
            render={({ field }) => (
              <FormItem className="w-full space-y-1">
                <FormLabel className="text-xs">Massa (kg) *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-9 w-full"
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

        {/* Botão Remover */}
        <div className="col-span-1 flex items-end pb-[2px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={!canRemove}
            className="w-full h-9"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Campo customizado de material */}
      {currentMaterial === "other" && (
        <FormField
          control={form.control}
          name={`${name}.${index}.other_name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Nome do Material *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Aço especial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Campo customizado de resistência */}
      {currentResistance === "other" && (
        <FormField
          control={form.control}
          name={`${name}.${index}.other_resistance`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                Tipo de resistência customizada (MPa) *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  placeholder="Ex: 500"
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

const SteelMaterialList = ({
  form,
  name,
  allowedMaterials = ["rebar", "other"],
}: SteelMaterialListProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  // Observar todos os valores de mass para calcular o total
  const steelArray = useWatch({
    control: form.control,
    name,
  });

  // Calcular soma total das massas
  const totalMass = (steelArray || []).reduce((sum: number, item: any) => {
    if (!item?.mass) return sum;
    // Converter valor brasileiro (1.234,56) para número
    const numericValue =
      typeof item.mass === "string"
        ? parseFloat(item.mass.replace(/\./g, "").replace(",", "."))
        : item.mass;
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  // Coletar materiais e resistências já utilizados
  const usedMaterials = (steelArray || [])
    .map((item: any) => item?.material)
    .filter(Boolean);

  const usedResistances = (steelArray || [])
    .map((item: any) => item?.resistance)
    .filter(Boolean);

  const materialOptions = allowedMaterials.map((key) => ({
    value: key,
    label: allMaterialOptions[key],
  }));

  const resistanceOptions = [
    { value: "CA50", label: "CA-50" },
    { value: "CA60", label: "CA-60" },
    { value: "CP190", label: "CP-190" },
    { value: "other", label: "Outro" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel className="text-xs text-gray-700">
          Materiais de Aço
        </FormLabel>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Total:</span>
          <span className="text-sm font-semibold text-gray-900">
            {totalMass.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            kg
          </span>
        </div>
      </div>

      {fields.map((field, index) => (
        <SteelMaterialItem
          key={field.id}
          form={form}
          name={name}
          index={index}
          fieldId={field.id}
          materialOptions={materialOptions}
          resistanceOptions={resistanceOptions}
          usedMaterials={usedMaterials}
          usedResistances={usedResistances}
          onRemove={() => remove(index)}
          canRemove={fields.length > 1}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const defaultMaterial = allowedMaterials[0] ?? "rebar";
          append({
            material: defaultMaterial,
            resistance: defaultResistanceByMaterial[defaultMaterial] ?? "CA50",
            mass: "0",
          });
        }}
        className="w-full text-green-600 border-green-600 hover:bg-green-50"
      >
        Adicionar
      </Button>
    </div>
  );
};

export default SteelMaterialList;
