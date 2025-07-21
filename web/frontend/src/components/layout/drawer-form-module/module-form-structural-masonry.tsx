import { ModuleFormSchema } from "@/validators/moduleForm.validator";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
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

interface ModuleFormStructuralMasonryProps {
  form: UseFormReturn<ModuleFormSchema>;
}

const ModuleFormStructuralMasonry = ({
  form,
}: ModuleFormStructuralMasonryProps) => {
  const { t } = useTranslation();

  const [showWarning, setShowWarning] = useState<string | null>(null);

  const fckOptions = ["20", "25", "30", "35", "40", "45"] as const;
  const fbkOptions = ["02", "04", "06", "08", "10", "12"] as const;
  const blockTypes = [
    "BL 14x4",
    "BL 14x19",
    "BL 14x34",
    "BL 14x39",
    "BL 14x54",
    "BL 19x4",
    "BL 19x19",
    "BL 19x39",
    "CL 14x19",
    "CL 14x34",
    "CL 14x14",
    "CL 14x39",
    "CL 19x19",
    "CL 19x39",
    "COMP 14x19",
    "COMP 14x39",
    "JOTA 14 x 39 x 19/9",
    "JOTA 14 x 19 x 19/9",
  ] as const;

  const renderConcreteFields = (
    fieldName: "vertical_grout" | "horizontal_grout",
    title: string
  ) => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: fieldName,
    });

    if (fields.length === 0) {
      append({ fck: "25" as const, volume: 0 });
    }

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
      <Card className="gap-1 dark:bg-dark-950">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ fck: "25" as const, volume: 0 })}
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
                    <FormLabel className="text-xs">
                      {t("drawerFormModule.commonForm.fckLabel")}
                    </FormLabel>
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
                    <FormLabel className="text-xs">
                      {t("drawerFormModule.commonForm.fckVolume")}
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

  const renderBlockFields = () => {
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "blocks",
    });

    if (fields.length === 0) {
      append({
        type: "BL 14x19" as const,
        fbk: "06" as const,
        quantity: 0,
      });
    }

    const handleRemove = (index: number) => {
      if (fields.length === 1) {
        setShowWarning("blocks");
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
            <CardTitle className="text-sm font-medium">
              {t("drawerFormModule.masonryForm.blocksLabel")}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  type: "BL 14x19" as const,
                  fbk: "06" as const,
                  quantity: 0,
                })
              }
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
                name={`blocks.${index}.type`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">
                      {t("drawerFormModule.masonryForm.blockTypeLabel")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "drawerFormModule.masonryForm.blockTypePlaceholder"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {blockTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                name={`blocks.${index}.fbk`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">
                      {t("drawerFormModule.masonryForm.blockFbkLabel")}
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="FBK" />
                        </SelectTrigger>
                        <SelectContent>
                          {fbkOptions.map((fbk) => (
                            <SelectItem key={fbk} value={fbk}>
                              {fbk}
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
                name={`blocks.${index}.quantity`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">
                      {t("drawerFormModule.masonryForm.blockQuantityLabel")}
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
          {showWarning === "blocks" && (
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
        {t("common.structureType.masonry")}
      </h3>

      {/* Graute */}
      <div className="grid grid-cols-1 gap-4">
        {renderConcreteFields(
          "vertical_grout",
          t("drawerFormModule.masonryForm.verticalGroutLabel")
        )}
        {renderConcreteFields(
          "horizontal_grout",
          t("drawerFormModule.masonryForm.horizontalGroutLabel")
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

      {/* Blocos */}
      <div className="grid grid-cols-1 gap-4">{renderBlockFields()}</div>
    </div>
  );
};

export default ModuleFormStructuralMasonry;
