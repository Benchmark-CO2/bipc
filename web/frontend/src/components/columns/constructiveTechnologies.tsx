import { Translations } from "@/i18n/translations/pt-BR";
import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TriangleAlert } from "lucide-react";

type TechRow = Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string };

export const makeConstructiveTechnologiesColumns = (
  t: Translations,
): ColumnDef<TechRow>[] => [
  {
    accessorKey: "type",
    header: t.columns.type,
    cell: ({ row }) => (
      <div className="text-left flex items-center gap-2">
        {structureTypes(t)[row.original.type] || "-"}
        {row.original.outdated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <TriangleAlert className="h-4 w-4 text-yellow-500 mx-2" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <span>{t.columns.outdatedTech}</span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">{t.columns.co2Min}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_min?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">{t.columns.co2Max}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_max?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">{t.columns.energyMin}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_min?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">{t.columns.energyMax}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_max?.toInternational()}` || "-"}
      </div>
    ),
  },
];
