import { Translations } from "@/i18n/translations/pt-BR";
import { TConsumption } from "@/types/projects";
import { TTowerFloorCategory } from "@/types/units";
import { ColumnDef } from "@tanstack/react-table";

type FloorRow = Pick<TTowerFloorCategory, "floor_group"> &
  TConsumption & { repetitions: number; area: number };

export const makeFloorsColumns = (t: Translations): ColumnDef<FloorRow>[] => [
  {
    accessorKey: "floor_group",
    header: t.columns.name,
    cell: ({ row }) => (
      <div className="text-left">{row.original.floor_group || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => <div className="text-center">{t.columns.area}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original.area?.toInternational()}` || "-"}
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
  {
    accessorKey: "repetitions",
    header: () => <div className="text-center">{t.columns.quantity}</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.repetitions || "-"}</div>
    ),
  },
];
