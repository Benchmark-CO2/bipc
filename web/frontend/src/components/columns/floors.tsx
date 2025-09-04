import { ColumnDef } from "@tanstack/react-table";
export const floorsColumns: ColumnDef<any>[] = [
  {
    accessorKey: "group_name",
    header: "Nome",
    cell: ({ row }) => row.original.group_name || "-",
  },
  {
    accessorKey: "area",
    header: "Área (m²)",
    cell: ({ row }) => row.original.area || "-",
  },
  {
    accessorKey: "height",
    header: "Altura (m)",
    cell: ({ row }) => row.original.height || "-",
  },
  // {
  //   accessorKey: "co2",
  //   header: "CO2",
  //   cell: ({ row }) => row.original.co2 || "-",
  // },
  // {
  //   accessorKey: "energy",
  //   header: "Energia",
  //   cell: ({ row }) => row.original.energy || "-",
  // },
  // {
  //   accessorKey: "density",
  //   header: "Densidade",
  //   cell: ({ row }) => row.original.density || "-",
  // },
  {
    accessorKey: "repetitions",
    header: "Quantidade",
    cell: ({ row }) => row.original.repetitions || "-",
  },
];
