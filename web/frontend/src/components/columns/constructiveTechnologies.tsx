import { ColumnDef } from "@tanstack/react-table";

export const constructiveTechnologies: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => row.original.name || "-",
  },
  {
    accessorKey: "co2",
    header: "CO2",
    cell: ({ row }) => row.original.co2 || "-",
  },
  {
    accessorKey: "energy",
    header: "Energia",
    cell: ({ row }) => row.original.energy || "-",
  },
  {
    accessorKey: "density",
    header: "Densidade",
    cell: ({ row }) => row.original.density || "-",
  },
];
