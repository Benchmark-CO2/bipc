/* eslint-disable @typescript-eslint/no-unsafe-return */
import { IProject } from '@/types/projects';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';

export const projectColumns: ColumnDef<IProject>[] = [
  {
    accessorKey: 'name',
    header:  t('projectTable.headers.name'),
    cell: ({ row }) => row.original.name || 'Sem nome'
  },
  {
    accessorKey: 'city',
    header: t('projectTable.headers.city'),
    cell: ({ row }) => row.original.city || 'Desconhecida'
  },
  {
    accessorKey: 'state',
    header: t('projectTable.headers.state'),
    cell: ({ row }) => row.original.state || 'Não informado'
  },
  {
    accessorKey: 'project_phase',
    header: t('projectTable.headers.projectPhase'),
    cell: ({ row }) => t(`common.projectPhaseOptions.${row.original.project_phase}`) || '-'
  },
  {
    accessorKey: 'users_len',
    header: t('projectTable.headers.users', { count: 2 }),
    cell: ({ row }) => row.original.users_len ?? '0'
  }
]
