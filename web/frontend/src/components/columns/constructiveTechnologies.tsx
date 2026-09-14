import { Translations } from "@/i18n/translations/pt-BR";
import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CheckCircle2, AlertCircle, TriangleAlert } from "lucide-react";

type TechRow = Omit<IModuleItem, "consumption"> &
  TConsumption & { option_id: string };

export const makeConstructiveTechnologiesColumns = (
  t: Translations,
  hasStatus: boolean = false,
): ColumnDef<TechRow>[] => [
  {
    accessorKey: "type",
    header: t.columns.type,
    cell: ({ row }) => {
      const isCompleted = row.original.completed === true;
      return (
        <div className="text-left flex items-center gap-2 w-full">
          <span className="shrink-0">
            {structureTypes(t)[row.original.type] || "-"}
          </span>
          <div className="ml-1 flex items-center gap-2 shrink-0">
            {hasStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <span>
                    {isCompleted
                      ? t.modules.badges.completed
                      : t.modules.badges.incomplete}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
            {row.original.outdated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="h-4 w-4 text-yellow-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <span>{t.columns.outdatedTech}</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "co2_range",
    header: () => (
      <div className="text-center">
        <div>{t.columns.co2Range}</div>
        <div className="text-xs font-normal text-inherit">(min - max)</div>
      </div>
    ),
    cell: ({ row }) => {
      const min = row.original.co2_min?.toInternational();
      const max = row.original.co2_max?.toInternational();
      return (
        <div className="text-center">
          {min && max ? `${min} - ${max}` : (min ?? max ?? "-")}
        </div>
      );
    },
  },
  {
    id: "energy_range",
    header: () => (
      <div className="text-center">
        <div>{t.columns.energyRange}</div>
        <div className="text-xs font-normal text-inherit">(min - max)</div>
      </div>
    ),
    cell: ({ row }) => {
      const min = row.original.energy_min?.toInternational();
      const max = row.original.energy_max?.toInternational();
      return (
        <div className="text-center">
          {min && max ? `${min} - ${max}` : (min ?? max ?? "-")}
        </div>
      );
    },
  },
  {
    accessorKey: "material",
    header: () => <div className="text-center">{t.columns.material}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.material?.toInternational()}` || "-"}
      </div>
    ),
  },
];
