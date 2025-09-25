import { TConsumption } from "@/types/projects";
import { TTowerFloorCategory } from "@/types/units";
import { ColumnDef } from "@tanstack/react-table";
export const floorsColumns: ColumnDef<
  Pick<TTowerFloorCategory, "group_name"> &
    TConsumption & { repetitions: number; area: number }
>[] = [
  {
    accessorKey: "group_name",
    header: "Nome",
    cell: ({ row }) => (
      <div className="text-left">{row.original.group_name || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => <div className="text-center">Área (m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.area?.toFixed(1)} m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO2 min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_min?.toFixed(1)} KgCO₂/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.co2_max?.toFixed(1)} KgCO₂/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_min?.toFixed(1)} MJ/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.energy_max?.toFixed(1)} MJ/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "repetitions",
    header: () => <div className="text-center">Quantidade</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.repetitions || "-"}</div>
    ),
  },
];
