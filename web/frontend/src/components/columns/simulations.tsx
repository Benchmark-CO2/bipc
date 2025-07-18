/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TSimulation } from '@/types/projects';
import { stringUtils } from '@/utils/string';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { Check, X } from 'lucide-react';

export const simulationColumns: ColumnDef<TSimulation>[] = [
  {
    accessorKey: 'selected',
    header: ({ table }) => (
        <input
          type='checkbox'
          checked={table.getIsAllRowsSelected()}
          onChange={() => table.toggleAllRowsSelected()}
          className='cursor-pointer'
        />
    ),
    cell: ({ row }) => (
        <input
          type='checkbox'
          checked={row.getIsSelected()}
          onChange={() => row.toggleSelected()}
          className='cursor-pointer'
        />
    ),
  },
  {
    accessorKey: 'name',
    header: t('simulationTable.headers.name'),
    cell: ({ row }) => row.original.name
  },
  {
    accessorKey: 'module',
    header: t('simulationTable.headers.module'),
    cell: ({ row }) => t(`common.structureType.${stringUtils.toCamelCase(row.original.structure_type)}`, { defaultValue: 'Sem nome' })
  },
  {
    accessorKey: 'version',
    header: t('simulationTable.headers.version'),
    cell: ({ row }) => row.original.version || 'Desconhecida'
  },
  // {
  //   accessorKey: 'created_at',
  //   header: t('simulationTable.headers.createdAt'),
  //   cell: ({ row }) => row.original.created_at ? new Intl.DateTimeFormat('pt-BR').format(new Date(row.original.created_at)) : '-'
  // },
  // {
  //   accessorKey: 'updated_at',
  //   header: t('simulationTable.headers.updatedAt'),
  //   cell: ({ row }) => row.original.updated_at ? new Intl.DateTimeFormat('pt-BR').format(new Date(row.original.updated_at)) : '-'
  // },
  {
    accessorKey: 'in_use',
    header: t('simulationTable.headers.isValid'),
    cell: ({ row }) => {
      return <div className='w-[50px] flex items-center justify-center'>{row.original.in_use ? <Check className='text-primary' /> : <X className='text-red-500' />}</div>;
    },
    size: 50,
  },
  
]
