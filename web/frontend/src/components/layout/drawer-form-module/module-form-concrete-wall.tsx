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
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { useTranslation } from "react-i18next";

interface ModuleFormConcreteWallProps {
  form: UseFormReturn<ModuleFormSchema>;
}

const ModuleFormConcreteWall = ({ form }: ModuleFormConcreteWallProps) => {
  const { t } = useTranslation();
  const fckOptions = ["20", "25", "30", "35", "40", "45"] as const;

  const renderConcreteFields = (
    fieldName: "concrete_walls" | "concrete_slabs",
    title: string
  ) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: fieldName,
    });

    return (
      <Card>
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
                onClick={() => remove(index)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {t("common.structureType.concreteWall")}
      </h3>

      {/* Concreto */}
      <div className="grid grid-cols-1 gap-4">
        {renderConcreteFields(
          "concrete_walls",
          t("drawerFormModule.concreteWallForm.concreteWallsLabel")
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

      {/* Espessuras e Áreas */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="wall_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.concreteWallForm.wallThicknessLabel")}
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
          name="slab_thickness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.concreteWallForm.slabThicknessLabel")}
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
          name="form_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.concreteWallForm.formAreaLabel")}
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
          name="wall_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormModule.concreteWallForm.wallAreaLabel")}
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

export default ModuleFormConcreteWall;
