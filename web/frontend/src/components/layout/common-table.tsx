import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import NotFoundList from "../ui/not-found-list";

interface ICommonTableProps {
  tableName: string | React.ReactNode;
  data: any[];
  columns: ColumnDef<any>[];
  onSelectionChange?: (selectedRows: any[]) => void;
  isSelectable?: boolean;
  expanded?: boolean;
  isInteractive?: boolean;
  actions?: React.ReactNode;
}

export default function CommonTable({
  tableName,
  data,
  columns,
  onSelectionChange,
  isSelectable,
  isInteractive,
  actions,
}: ICommonTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Reset selection when isSelectable changes
  useEffect(() => {
    if (!isSelectable) {
      setRowSelection({});
    }
  }, [isSelectable]);

  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: isSelectable ?? false,
    state: {
      rowSelection,
    },
  });

  useEffect(() => {
    const selectedRows = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    onSelectionChange?.(selectedRows);
  }, [rowSelection, onSelectionChange, table]);

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {tableName}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {data.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 transition-transform duration-200 ease-in-out hover:scale-110"
            >
              <div
                className={`transition-transform duration-300 ease-in-out ${isCollapsed ? "rotate-0" : "rotate-180"}`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </Button>
          )}
        </div>
      </div>

      {data.length > 0 ? (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isCollapsed
              ? "max-h-0 opacity-0 transform scale-y-95"
              : "max-h-[2000px] opacity-100 transform scale-y-100"
          }`}
          style={{
            transformOrigin: "top",
            transitionProperty: "max-height, opacity, transform",
          }}
        >
          <div
            className={`transition-transform duration-300 ease-in-out ${isCollapsed ? "translate-y-[-10px]" : "translate-y-0"}`}
          >
            <Table>
              <TableHeader
                className={isInteractive ? "bg-gray-50 dark:bg-gray-800" : ""}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {isSelectable && (
                      <TableHead>
                        <Checkbox
                          checked={
                            Object.keys(rowSelection).length ===
                              table.getRowModel().rows.length &&
                            table.getRowModel().rows.length > 0
                              ? true
                              : Object.keys(rowSelection).length > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) => {
                            setRowSelection(() => {
                              if (checked === true) {
                                // Selecionar todas as linhas
                                const newSelection: RowSelectionState = {};
                                table.getRowModel().rows.forEach((row) => {
                                  newSelection[row.id] = true;
                                });
                                return newSelection;
                              } else {
                                // Desselecionar todas as linhas
                                return {};
                              }
                            });
                          }}
                          aria-label="Selecionar tudo"
                        />
                      </TableHead>
                    )}
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
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
                  >
                    {isSelectable && (
                      <TableCell>
                        <Checkbox
                          checked={!!rowSelection[row.id]}
                          onCheckedChange={(checked) => {
                            setRowSelection((prev) => {
                              const newSelection = { ...prev };
                              if (checked === true) {
                                newSelection[row.id] = true;
                              } else {
                                delete newSelection[row.id];
                              }
                              return newSelection;
                            });
                          }}
                          aria-label="Selecionar linha"
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <NotFoundList
          message="No data available"
          showIcon={false}
          description="No data available in this table"
        />
      )}
    </div>
  );
}
