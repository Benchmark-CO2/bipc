import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { TModulesTypes } from "@/types/modules";

export interface ModuleFilterState {
  visibleModules: Set<TModulesTypes>;
  moduleOrder: TModulesTypes[];
}

interface ModuleFilterProps {
  availableModules: {
    type: TModulesTypes;
    count: number;
    disabled: boolean;
  }[];
  filterState: ModuleFilterState;
  onFilterChange: (newState: ModuleFilterState) => void;
}

export default function ModuleFilter({
  availableModules,
  filterState,
  onFilterChange,
}: ModuleFilterProps) {
  const { t } = useTranslation();

  const moduleDisplayNames = {
    concrete_wall: t("common.structureType.concreteWall"),
    beam_column: t("common.structureType.beamColumn"),
    structural_masonry: t("common.structureType.masonry"),
  };

  const handleModuleToggle = (moduleType: TModulesTypes, checked: boolean) => {
    const newVisibleModules = new Set(filterState.visibleModules);

    if (checked) {
      newVisibleModules.add(moduleType);
    } else {
      newVisibleModules.delete(moduleType);
    }

    onFilterChange({
      ...filterState,
      visibleModules: newVisibleModules,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            {t("modulesTable.filter.buttonText")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5 text-sm font-semibold">
            {t("modulesTable.filter.visibleModules")}
          </div>
          <DropdownMenuSeparator />

          {availableModules.map((module) => (
            <DropdownMenuItem
              key={module.type}
              className="flex items-center gap-2 px-2 py-2"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={filterState.visibleModules.has(module.type)}
                disabled={module.disabled}
                onCheckedChange={(checked) =>
                  handleModuleToggle(module.type, checked as boolean)
                }
                className="shrink-0"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {moduleDisplayNames[module.type]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {module.count}{" "}
                  {module.count === 1
                    ? t("modulesTable.filter.module_one")
                    : t("modulesTable.filter.module_other")}
                  {module.disabled &&
                    " (" + t("modulesTable.filter.empty") + ")"}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
