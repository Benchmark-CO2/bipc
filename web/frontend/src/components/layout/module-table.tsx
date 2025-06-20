import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable
} from '@tanstack/react-table';
// import { IModule } from '@/types/modules'
import { useNavigate } from '@tanstack/react-router';
import { ChartLine, Pen } from 'lucide-react';
import { moduleColumns } from '../columns/modules';
// import { Checkbox } from '../ui/checkbox'
import { TModuleData } from '@/types/projects';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NotFoundList from '../ui/not-found-list';
import DrawerEditModule from './drawer-edit-module';

interface IModuleTable {
  modules: TModuleData[]
  projectId: string
  unitId: string
  handleUpdateModule: (module: TModuleData) => void
}

export default function ModuleTable({ modules, projectId, unitId, handleUpdateModule }: IModuleTable) {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: '/projects/$projectId' })

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data: modules,
    columns: moduleColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection
  })

  const onClickModuleSimulation = (moduleId: string) => {
    void navigate({
      to: `/projects/${projectId}/${unitId}/${moduleId}`,
      from: '/projects/$projectId/$unitId'
    })
  }

  // const selectedRowModel = table.getSelectedRowModel()

  // const totals = useMemo(() => {
  //   const selected = selectedRowModel.rows

  //   return {
  //     kg: selected.reduce((acc, row) => acc + (row.original.consume_kg || 0), 0),
  //     kgco2: selected.reduce((acc, row) => acc + (row.original.consume_kgco2 || 0), 0),
  //     mj: selected.reduce((acc, row) => acc + (row.original.consume_mj || 0), 0)
  //   }
  // }, [selectedRowModel.rows])

  const handleClickRow = (e: React.MouseEvent<HTMLTableRowElement>, module: TModuleData) => {
    const target = e.target as HTMLElement
    const dataType = target.closest('[data-action]')?.getAttribute('data-action')
    if (dataType === 'open-simulations') {
      onClickModuleSimulation(module.module_uuid)
    }

    // else if (dataType === 'delete-module') {
    //   setModuleToDelete(module)
    // } else if (dataType === 'edit-module') {
    //   setModuleToEdit(module)
    // }
  }

  return (
    <div className='space-y-4 rounded-md border p-4'>
      {modules.length === 0 ? (
        <NotFoundList
          message={t('common.noItemsFound')}
          description={t('drawerAddModule.addConstructiveTechnology')}
          icon='file'
          showIcon={true}
        />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {/* <TableHead>
                  <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value: boolean | 'indeterminate') => {
                      table.toggleAllPageRowsSelected(!!value)
                    }}
                    aria-label='Selecionar tudo'
                  />
                </TableHead> */}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
                <TableHead></TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                data-action='open-module'
                key={row.id}
                className='hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800'
                data-state={row.getIsSelected() && 'selected'}
                onClick={(e) => handleClickRow(e, row.original)}
              >
                {/* <TableCell>
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value: boolean | 'indeterminate') => {
                      row.toggleSelected(!!value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label='Selecionar linha'
                  />
                </TableCell> */}
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
                <TableCell>
                  <div className='flex items-center justify-end gap-2'>
                    <ChartLine data-action='open-simulations' className='hover:scale-105' />
                    <DrawerEditModule
                      componentTrigger={<Pen size={16} data-action='edit-module' className='hover:scale-105' />}
                      module={row.original}
                      callback={handleUpdateModule}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {/* <TableRow>
              <TableCell colSpan={4}>Selecionados ({selectedRowModel.rows.length}) :</TableCell>
              <TableCell>{totals.kg} kg</TableCell>
              <TableCell>{totals.kgco2} kgCO₂</TableCell>
              <TableCell>{totals.mj} MJ</TableCell>
            </TableRow> */}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
