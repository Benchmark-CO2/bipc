import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ISimulation } from '@/types/simulations'
import { TSimulation } from '@/types/projects';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Check, EllipsisVertical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { simulationColumns } from '../columns/simulations';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface ISimulationTable {
  simulations: TSimulation[]
  onClickSimulation: (simulationUid: string) => void
  onClickSetValidVersion: (simulationUid: string) => void
  selectedSimulations: TSimulation['version'][]
  setSelectedSimulations: (simulations: TSimulation['version'][]) => void
  onCheckSimulation: (simulation: TSimulation['version']) => void
}

function SimulationTable({ simulations, onClickSetValidVersion, setSelectedSimulations, selectedSimulations, onCheckSimulation }: ISimulationTable) {
  const { t } = useTranslation();
  const [reloadTrigger, setReloadTrigger] = useState(false);
  const table = useReactTable({ 
    data: simulations,
    columns: simulationColumns,
    getCoreRowModel: getCoreRowModel(),
    renderFallbackValue: String(t('simulationTable.loading')),
  });
const startReload = () => {
    setTimeout(() => {
      setReloadTrigger(false);
    }, 1000)
  }
  useEffect(() => {
    // This effect can be used to trigger a reload of the table data if needed
    // For example, you can fetch new data and update the state here
    setReloadTrigger(true);
    startReload()
  }, [simulations]);

  const rowModel = useMemo(() => {
    return table.getRowModel();
  }, [table, reloadTrigger]);
  
  useEffect(() => {
    if (selectedSimulations.length !== table.getSelectedRowModel().rows.length) {
      setSelectedSimulations(table.getSelectedRowModel().rows.map((row) => row.original.version))
    }
  }, [onCheckSimulation, table.getSelectedRowModel().rows]);

  return (
    <div className='rounded-md border p-4'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rowModel.rows.map((row) => (
            <TableRow
              key={row.id}
              className='hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800'
              onClick={() => {
                row.toggleSelected(!row.getIsSelected(), {
                  selectChildren: true,
                });
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
              <TableCell>
                <DropdownMenu dir='ltr'>
                  <DropdownMenuTrigger className='text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer outline-0'>
                    <EllipsisVertical size={24} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem className='flex items-center text-base justify-between cursor-pointer' onClick={() => onClickSetValidVersion(row.original.version.toString())}>
                      {t('simulationTable.setValidVersion')}
                      <Check className='stroke-primary' size={32} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <span className='block w-full text-xs text-foreground/60 my-2'>{t('simulationTable.selectVersions')}</span>
    </div>
  );
}

export default SimulationTable;