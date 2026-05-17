import { Translations } from "@/i18n/translations/pt-BR";
import { TModuleStructure } from "@/types/modules";
import { ColumnDef } from "@tanstack/react-table";
import { Check, X } from "lucide-react";

export const makeVersionsColumns = (
  tLocal: Translations,
): ColumnDef<TModuleStructure>[] => [
  {
    accessorKey: "selected",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        onChange={() => table.toggleAllRowsSelected()}
        className="cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={() => row.toggleSelected()}
        className="cursor-pointer"
      />
    ),
  },
  {
    accessorKey: "version",
    header: tLocal.columns.version,
    cell: ({ row }) => (row.original as any).version || "-",
  },
  {
    accessorKey: "co2_min",
    header: "CO₂ Min.",
    cell: ({ row }) => (row.original as any).co2_min?.toInternational() || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO₂ Max.",
    cell: ({ row }) => (row.original as any).co2_max?.toInternational() || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energia Min.",
    cell: ({ row }) => (row.original as any).energy_min?.toInternational() || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energia Max.",
    cell: ({ row }) => (row.original as any).energy_max?.toInternational() || "-",
  },
  {
    accessorKey: "in_use",
    header: "Em uso",
    cell: ({ row }) => (
      <div className="w-[50px] flex items-center justify-center">
        {(row.original as any).in_use ? (
          <Check className="text-primary" />
        ) : (
          <X className="text-red-500" />
        )}
      </div>
    ),
  },
];
