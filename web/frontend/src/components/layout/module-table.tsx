import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
// import { IModule } from '@/types/modules'
import { useNavigate } from "@tanstack/react-router";
import { ChartLine, Pen, Trash } from "lucide-react";
import { moduleColumns } from "../columns/modules";
// import { Checkbox } from '../ui/checkbox'
import { IModuleItem } from "@/types/modules";
import { TModuleData } from "@/types/projects";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import NotFoundList from "../ui/not-found-list";
import DrawerFormModule from "./drawer-form-module";
import ModalSimple from "./modal-simple";

interface IModuleTable {
  tableId: "concrete_wall" | "beam_column" | "structural_masonry";
  modules: IModuleItem[];
  projectId: string;
  unitId: string;
  handleUpdateModule: (module: TModuleData) => void;
  handleDeleteModule?: (moduleId: string) => void;
  onSelectionChange?: (selectedModules: IModuleItem[]) => void;
}

export default function ModuleTable({
  tableId,
  modules,
  projectId,
  unitId,
  // handleUpdateModule,
  handleDeleteModule,
  onSelectionChange,
}: IModuleTable) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/projects/$projectId" });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data: modules,
    columns: moduleColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
  });

  const onClickModuleSimulation = (moduleId: string) => {
    void navigate({
      to: `/projects/${projectId}/${unitId}/${moduleId}`,
      from: "/projects/$projectId/$unitId",
    });
  };

  const selectedRowModel = table.getSelectedRowModel();

  useEffect(() => {
    const selectedModules = selectedRowModel.rows.map((row) => row.original);
    onSelectionChange?.(selectedModules);
  }, [selectedRowModel.rows, onSelectionChange]);

  const totals = useMemo(() => {
    const selected = selectedRowModel.rows;

    const totalRepetitions = selected.reduce(
      (acc, row) => acc + (row.original.floor_repetition || 1),
      0
    );

    return {
      total_concrete: selected.reduce(
        (acc, row) =>
          acc +
          (row.original.total_concrete || 0) *
            (row.original.floor_repetition || 1),
        0
      ),
      total_steel: selected.reduce(
        (acc, row) =>
          acc +
          (row.original.total_steel || 0) *
            (row.original.floor_repetition || 1),
        0
      ),

      co2_min:
        totalRepetitions > 0
          ? selected.reduce(
              (acc, row) =>
                acc +
                (row.original.co2_min || 0) *
                  (row.original.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      co2_max:
        totalRepetitions > 0
          ? selected.reduce(
              (acc, row) =>
                acc +
                (row.original.co2_max || 0) *
                  (row.original.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      energy_min:
        totalRepetitions > 0
          ? selected.reduce(
              (acc, row) =>
                acc +
                (row.original.energy_min || 0) *
                  (row.original.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      energy_max:
        totalRepetitions > 0
          ? selected.reduce(
              (acc, row) =>
                acc +
                (row.original.energy_max || 0) *
                  (row.original.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
    };
  }, [selectedRowModel.rows]);

  const handleClickRow = (
    e: React.MouseEvent<HTMLTableRowElement>,
    module: IModuleItem
  ) => {
    const target = e.target as HTMLElement;
    const dataType = target
      .closest("[data-action]")
      ?.getAttribute("data-action");
    if (dataType === "open-simulations") {
      onClickModuleSimulation(module.id.toString());
    }
  };

  const displayName = {
    concrete_wall: t("common.structureType.concreteWall"),
    beam_column: t("common.structureType.beamColumn"),
    structural_masonry: t("common.structureType.masonry"),
  };

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {displayName[tableId] ||
              tableId
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>
        </div>
        <DrawerFormModule
          triggerComponent={
            <Button
              size="sm"
              variant="bipc"
              className="flex items-center gap-2"
            >
              {t("drawerFormModule.createButtonTrigger")}
            </Button>
          }
          projectId={projectId}
          unitId={unitId}
          structureType={tableId}
        />
      </div>

      {modules.length === 0 ? (
        <NotFoundList
          message={t("modulesTable.noItemsFound")}
          description={t("modulesTable.addNewTechnology")}
          icon="file"
          showIcon={false}
        />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableHead>
                  <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value: boolean | "indeterminate") => {
                      table.toggleAllPageRowsSelected(!!value);
                    }}
                    aria-label="Selecionar tudo"
                  />
                </TableHead>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
                <TableHead></TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                data-action="open-module"
                key={row.id}
                className="hover:cursor-pointer hover:bg-dark-100 dark:hover:bg-dark-950"
                data-state={row.getIsSelected() && "selected"}
                onClick={(e) => handleClickRow(e, row.original)}
              >
                <TableCell>
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value: boolean | "indeterminate") => {
                      row.toggleSelected(!!value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Selecionar linha"
                  />
                </TableCell>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <ChartLine
                      data-action="open-simulations"
                      className="hover:scale-105"
                    />
                    <DrawerFormModule
                      triggerComponent={
                        <Pen
                          size={16}
                          data-action="edit-module"
                          className="hover:scale-105"
                        />
                      }
                      moduleId={row.original.id.toString()}
                      projectId={projectId}
                      unitId={unitId}
                    />
                    <ModalSimple
                      componentTrigger={
                        <Trash size={16} className="hover:scale-105" />
                      }
                      content={t("modalConfirmDelete.description")}
                      title={t("modalConfirmDelete.moduleTitle")}
                      onConfirm={() => {
                        handleDeleteModule?.(row.original.id.toString());
                      }}
                      confirmTitle={t("modalConfirmDelete.deleteButton")}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell>{totals.total_concrete.toFixed(2)} kg/m²</TableCell>
              <TableCell>{totals.total_steel.toFixed(2)} kg/m²</TableCell>
              <TableCell>{totals.co2_min.toFixed(2)} kgCO₂/m²</TableCell>
              <TableCell>{totals.co2_max.toFixed(2)} kgCO₂/m²</TableCell>
              <TableCell>{totals.energy_min.toFixed(2)} MJ/m²</TableCell>
              <TableCell>{totals.energy_max.toFixed(2)} MJ/m²</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
