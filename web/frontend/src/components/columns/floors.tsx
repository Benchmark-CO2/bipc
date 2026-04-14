import { TConsumption } from "@/types/projects";
import { TTowerFloorCategory } from "@/types/units";
import { ColumnDef } from "@tanstack/react-table";

export const floorsColumns: ColumnDef<
  Pick<TTowerFloorCategory, "floor_group"> &
    TConsumption & { repetitions: number; area: number }
>[] = [
  {
    accessorKey: "floor_group",
    header: "Nome",
    cell: ({ row }) => (
      <div className="text-left">{row.original.floor_group || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => <div className="text-center">Área (m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.area?.toInternational()}` || "-"}
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
  {
    accessorKey: "repetitions",
    header: () => <div className="text-center">Quantidade</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.repetitions || "-"}</div>
    ),
  },
];
