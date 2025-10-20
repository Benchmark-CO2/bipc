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
  lastRow?: {
    type: "Total" | "Média";
    data: Record<string, string | number>;
  };
  collapsed?: boolean;
  onClickRow?: (rowData: any) => void;
}

export default function CommonTable({
  tableName,
  data,
  columns,
  onSelectionChange,
  isSelectable,
  isInteractive,
  actions,
  lastRow,
  collapsed = false,
  onClickRow,
}: ICommonTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

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
          <h3 className="text-md font-semibold text-primary dark:text-gray-100">
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
                className={
                  isInteractive
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#E4E4E7] dark:bg-gray-800 text-primary"
                }
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="hover:bg-transparent"
                  >
                    {isSelectable && (
                      <TableHead className="text-inherit">
                        <Checkbox
                          className={
                            isInteractive
                              ? "border-2 border-white bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-white"
                              : "data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                          }
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
                      <TableHead key={header.id} className="text-inherit">
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
                {table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    data-action="open-module"
                    key={row.id}
                    className={
                      isInteractive
                        ? "hover:cursor-pointer hover:bg-dark-100 dark:hover:bg-dark-950"
                        : ""
                    }
                    style={{
                      backgroundColor: index % 2 === 0 ? "#E3F3F6" : "#FBFEFE",
                    }}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onClickRow && onClickRow(row.original)}
                  >
                    {isSelectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          className={
                            isInteractive
                              ? "border-2 border-gray-400 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-white"
                              : "border border-gray-300 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                          }
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
                {lastRow && (
                  <TableRow className="bg-secondary/20 hover:bg-secondary/30 font-semibold">
                    {isSelectable && <TableCell></TableCell>}
                    <TableCell className="font-semibold text-left">
                      {lastRow.type}
                    </TableCell>
                    {table
                      .getHeaderGroups()[0]
                      .headers.slice(1)
                      .map((header, index) => (
                        <TableCell
                          key={index}
                          className="font-normal text-center"
                        >
                          {lastRow.data[
                            header.column.id as keyof typeof lastRow.data
                          ] || "-"}
                        </TableCell>
                      ))}
                  </TableRow>
                )}
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
