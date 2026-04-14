import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { TriangleAlert } from "lucide-react";

export const constructiveTechnologies: ColumnDef<
  Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string }
>[] = [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="text-left flex items-center gap-2">
        {structureTypes[row.original.type] || "-"}
        {row.original.outdated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <TriangleAlert className="h-4 w-4 text-yellow-500 mx-2" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <span>
                Essa tecnologia construtiva está desatualizada devido a mudanças
                na unidade. Atualize-a!
              </span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO₂ Min. (kgCO₂/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_min?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO₂ Max. (kgCO₂/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_max?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia Min. (MJ/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_min?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia Max. (MJ/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_max?.toInternational()}` || "-"}
      </div>
    ),
  },
];
