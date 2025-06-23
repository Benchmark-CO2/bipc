import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { UseFormReturn } from "react-hook-form";
import { UnitFormSchema } from "@/validators/unitForm.validator";
import { useTranslation } from "react-i18next";

interface UnitFormTowerProps {
  form: UseFormReturn<UnitFormSchema>;
}

const UnitFormTower: React.FC<UnitFormTowerProps> = ({ form }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="total_floors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.total_floors")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="15"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tower_floors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.tower_floors")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="10"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="base_floors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.base_floors")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="basement_floors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.basement_floors")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="2"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="type_floors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.type_floors")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="6"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="total_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("drawerFormUnit.towerForm.total_area")} *
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12500.75"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
};

export default UnitFormTower;
