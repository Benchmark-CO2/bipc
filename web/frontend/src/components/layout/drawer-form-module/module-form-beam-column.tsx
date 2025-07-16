import { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { ModuleFormSchema } from "@/validators/moduleForm.validator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { useTranslation } from "react-i18next";

interface ModuleFormBeamColumnProps {
  form: UseFormReturn<ModuleFormSchema>;
}

const ModuleFormBeamColumn = ({ form }: ModuleFormBeamColumnProps) => {
  const { t } = useTranslation();
  const fckOptions = ["20", "25", "30", "35", "40", "45"] as const;
  const [showWarning, setShowWarning] = useState<string | null>(null);

  const renderConcreteFields = (
    fieldName: "concrete_columns" | "concrete_beams" | "concrete_slabs",
    title: string
  ) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: fieldName,
    });

    // Garante que há pelo menos um elemento
    // if (fields.length === 0) {
    //   append({ fck: "30" as const, volume: 0 });
    // }

    const handleRemove = (index: number) => {
      if (fields.length === 1) {
        setShowWarning(fieldName);
        setTimeout(() => {
          setShowWarning(null);
        }, 3000);
        return;
      }
      remove(index);
    };

    return (
      <Card className="gap-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ fck: "30" as const, volume: 0 })}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <FormField
                control={form.control}
                name={`${fieldName}.${index}.fck` as any}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">FCK (MPa)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="FCK" />
                        </SelectTrigger>
                        <SelectContent>
                          {fckOptions.map((fck) => (
                            <SelectItem key={fck} value={fck}>
                              {fck}
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
                name={`${fieldName}.${index}.volume` as any}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Volume (m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemove(index)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {showWarning === fieldName && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>
                {t("drawerFormModule.commonForm.minimumElementRequired")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {t("common.structureType.beamColumn")}
      </h3>

      {/* Concreto */}
      <div className="grid grid-cols-1 gap-4">
        {renderConcreteFields(
          "concrete_columns",
          t("drawerFormModule.beamColumnForm.concreteColumnsLabel")
        )}
        {renderConcreteFields(
          "concrete_beams",
          t("drawerFormModule.beamColumnForm.concreteBeamsLabel")
        )}
        {renderConcreteFields(
          "concrete_slabs",
          t("drawerFormModule.commonForm.concreteSlabsLabel")
        )}
      </div>

      {/* Aços */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="steel_ca50"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.commonForm.steelCA50Label")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="steel_ca60"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.commonForm.steelCA60Label")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Formas */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="form_columns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.formColumnsLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="form_beams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.formBeamsLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="form_slabs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.formSlabsLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="form_total"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.formTotalLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Dados adicionais */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="column_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.columnNumberLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avg_beam_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.avgBeamSpanLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avg_slab_span"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.beamColumnForm.avgSlabSpanLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ModuleFormBeamColumn;
