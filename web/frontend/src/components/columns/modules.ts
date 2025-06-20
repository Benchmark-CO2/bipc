 
/* eslint-disable @typescript-eslint/no-unsafe-return */
// import { IModule } from '@/types/modules'
import { TModuleData } from '@/types/projects';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';

export const moduleColumns: ColumnDef<TModuleData>[] = [
  {
    accessorKey: 'tipoDeEstrutura',
    header: t('modulesTable.headers.structureType'),
    cell: ({ row: { original: { tipoDeEstrutura } } }) => t(`modulesTable.structureType.${tipoDeEstrutura}`) || 'Sem tipo de estrutura'
  },
  {
    accessorKey: 'tipoDeEdificacao',
    header: t('modulesTable.headers.buildingType'),
    cell: ({ row }) => t(`modulesTable.buildingType.${row.original.tipoDeEdificacao}`) || 'Sem tipo de edificação'
  },
  {
    accessorKey: 'created_at',
    header: t('modulesTable.headers.createdAt'),
    cell: ({ row }) => row.original?.created_at ? new Intl.DateTimeFormat('pt-BR').format(new Date(row.original?.created_at)) :  'Sem data'	
  },
  {
    accessorKey: 'areaConstruidaTotal',
    header: t('modulesTable.headers.buildedAreaTotal'),
    cell: ({ row }) => row.original.areaConstruidaTotal || 'Sem área construída total'
  },
  {
    accessorKey: 'consumoDeAco',
    header: t('modulesTable.headers.steelConsumption'),
    cell: ({ row }) => row.original.consumoDeAco || 'Sem consumo de aço'
  }

  // {
  //   accessorKey: 'name',
  //   header: 'Nome',
  //   cell: ({ row }) => row.original.name || 'Sem nome'
  // },
  // {
  //   accessorKey: 'version',
  //   header: 'Versão',
  //   cell: ({ row }) => row.original.version || 'Desconhecida'
  // },
  // {
  //   accessorKey: 'status',
  //   header: 'Status',
  //   cell: ({ row }) => row.original.status
  // },
  // {
  //   accessorKey: 'consume_kg',
  //   header: 'Consumo (kg)',
  //   cell: ({ row }) => row.original.consume_kg || '-'
  // },
  // {
  //   accessorKey: 'consume_kgco2',
  //   header: 'Consumo (kgCO2)',
  //   cell: ({ row }) => row.original.consume_kgco2 || '-'
  // },
  // {
  //   accessorKey: 'consume_mj',
  //   header: 'Consumo (MJ)',
  //   cell: ({ row }) => row.original.consume_mj || '-'
  // }
]
