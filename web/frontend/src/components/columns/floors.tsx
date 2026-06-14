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
    accessorKey: "repetitions",
    header: () => <div className="text-center">{t.columns.quantity}</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.repetitions || "-"}</div>
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
    id: "co2_range",
    header: () => (
      <div className="text-center">
        <div>{t.columns.co2Range}</div>
        <div className="text-xs font-normal text-white/70">(min - max)</div>
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
        <div className="text-xs font-normal text-white/70">(min - max)</div>
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
    id: "material",
    header: () => <div className="text-center">{t.columns.material}</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.material
          ? `${row.original.material.toInternational()}`
          : "-"}
      </div>
    ),
  },
];
