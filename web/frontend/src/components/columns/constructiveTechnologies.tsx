import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";

export const constructiveTechnologies: ColumnDef<
  Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string }
>[] = [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => (
      <div className="text-left">
        {structureTypes[row.original.type] || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO2 Min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.co2_min?.toFixed(2) || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 Max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.co2_max?.toFixed(2) || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia Min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.energy_min?.toFixed(2) || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia Max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.energy_max?.toFixed(2) || "-"}
      </div>
    ),
  },
];
