import { Translations } from "@/i18n/translations/pt-BR";
import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { parseNumber } from "@/utils/numbers";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CircleAlert, TriangleAlert } from "lucide-react";

type TechRow = Omit<IModuleItem, "consumption"> &
  TConsumption & { option_id: string };

type CompletenessLevel = "empty" | "partial" | "complete" | "unknown";

const getCompletenessLevel = (row: TechRow): CompletenessLevel => {
  const tc = parseNumber(String((row as any).total_concrete ?? 0));
  const ts = parseNumber(String((row as any).total_steel ?? 0));

  const hasMaterial = (row.material ?? 0) > 0;
  const isMasonry = row.type.includes("masonry");

  if (tc === 0 && ts === 0 && !hasMaterial) return "empty";
  if (tc > 0 && ts > 0) return "complete";
  if (
    (tc > 0 && ts === 0) ||
    (ts > 0 && tc === 0) ||
    (isMasonry && hasMaterial && ts === 0)
  )
    return "partial";
  return "unknown";
};

export const makeConstructiveTechnologiesColumns = (
  t: Translations,
): ColumnDef<TechRow>[] => [
  {
    accessorKey: "type",
    header: t.columns.type,
    cell: ({ row }) => {
      const level = getCompletenessLevel(row.original);
      return (
        <div className="text-left flex items-center gap-2">
          {structureTypes(t)[row.original.type] || "-"}
          {level === "partial" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className="h-4 w-4 text-orange-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px]">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-orange-600">
                    {t.columns.partialLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.columns.partialTech}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          {level === "empty" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleAlert className="h-4 w-4 text-gray-400 shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px]">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-gray-600">
                    {t.columns.emptyLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.columns.emptyTech}
                  </span>
                </div>
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
