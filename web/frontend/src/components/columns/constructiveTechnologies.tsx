import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { formatNumber } from '@/utils/numbers';
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
    header: () => <div className="text-center">CO2 Min (KgCO₂/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${parseFloat(row.original.co2_min)?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 Max (KgCO₂/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${parseFloat(row.original.co2_max)?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia Min (MJ/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${parseFloat(row.original.energy_min)?.toInternational()}` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia Max (MJ/m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${parseFloat(row.original.energy_max)?.toInternational()}` || "-"}
      </div>
    ),
  },
];
