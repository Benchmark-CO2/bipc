/* eslint-disable @typescript-eslint/no-unsafe-return */
// import { IModule } from '@/types/modules'
import { TModuleData } from "@/types/projects";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";

export const moduleColumns: ColumnDef<TModuleData>[] = [
  {
    accessorKey: "nome",
    header: t("modulesTable.headers.name"),
    cell: ({ row }) => row.original.nome || "Sem nome",
  },
  {
    accessorKey: "tipoDeEstrutura",
    header: t("modulesTable.headers.structureType"),
    cell: ({
      row: {
        original: { tipoDeEstrutura },
      },
    }) =>
      t(`modulesTable.structureType.${tipoDeEstrutura}`) ||
      "Sem tipo de estrutura",
  },
  {
    accessorKey: "areaConstruidaTotal",
    header: t("modulesTable.headers.buildedAreaTotal"),
    cell: ({ row }) =>
      row.original.areaConstruidaTotal || "Sem área construída total",
  },
  {
    accessorKey: "consumoDeAco",
    header: t("modulesTable.headers.steelConsumption"),
    cell: ({ row }) => row.original.consumoDeAco || "Sem consumo de aço",
  },
  {
    accessorKey: "consumoDeConcreto",
    header: t("modulesTable.headers.concreteConsumption"),
    cell: ({ row }) =>
      row.original.consumoDeConcreto || "Sem consumo de concreto",
  },
  {
    accessorKey: "emissaoDeCo2",
    header: t("modulesTable.headers.co2Emission"),
    cell: ({ row }) => row.original.emissaoDeCo2 || "Sem emissão de CO2",
  },
  {
    accessorKey: "energia",
    header: t("modulesTable.headers.energy"),
    cell: ({ row }) => row.original.energia || "Sem energia",
  },
];
