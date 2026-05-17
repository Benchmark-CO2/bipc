/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Translations } from "@/i18n/translations/pt-BR";
import { TSimulation } from "@/types/projects";
import { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";
import { Checkbox } from "../ui/checkbox";

export const makeSimulationColumns = (
  t: Translations,
): ColumnDef<TSimulation>[] => [
  {
    accessorKey: "selected",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={() => table.toggleAllRowsSelected()}
        onClick={(e) => e.stopPropagation()}
        aria-label={t.columns.selectRow}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={() => row.toggleSelected()}
        onClick={(e) => e.stopPropagation()}
        aria-label={t.columns.selectRow}
      />
    ),
  },
  {
    accessorKey: "name",
    header: t.columns.name,
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "co2_min",
    header: "CO\u2082 Min",
    cell: ({ row }) => row.original.co2_min?.toInternational() || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO\u2082 Max",
    cell: ({ row }) => row.original.co2_max?.toInternational() || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energy Min",
    cell: ({ row }) => row.original.energy_min?.toInternational() || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energy Max",
    cell: ({ row }) => row.original.energy_max?.toInternational() || "-",
  },
  {
    accessorKey: "version",
    header: t.columns.version,
    cell: ({ row }) => row.original.version || t.columns.unknown,
  },
  {
    accessorKey: "in_use",
    header: "In Use",
    cell: ({ row }) => {
      return (
        <div className="w-[50px] flex items-center justify-center">
          {row.original.in_use ? (
            <Check className="text-primary" />
          ) : (
            <X className="text-red-500" />
          )}
        </div>
      );
    },
    size: 50,
  },
];
