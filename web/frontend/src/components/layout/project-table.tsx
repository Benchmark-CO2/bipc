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
  useReactTable,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { IProject } from "@/types/projects";
import { Edit, Trash } from "lucide-react";
import ModalConfirmDelete from "./modal-confirm-delete";
import DrawerFormProject from "./drawer-form-project";

interface IProjectTable {
  projects: IProject[];
  onClickProject: (projectUid: string) => void;
  onDeleteProject?: (projectUid: string) => void;
}

export default function ProjectTable({
  projects,
  onClickProject,
  onDeleteProject,
}: IProjectTable) {
  const { t } = useTranslation();

  const table = useReactTable({
    data: projects,
    columns: [
      {
        id: "name",
        header: t("projectTable.headers.name"),
        cell: ({ row }) => String(row.original.name),
      },
      {
        id: "description",
        header: t("projectTable.headers.description"),
        cell: ({ row }) => String(row.original.description) || "-",
      },
      {
        id: "createdAt",
        header: t("projectTable.headers.createdAt"),
        cell: ({ row }) =>
          new Intl.DateTimeFormat(i18n.languages[0]).format(
            new Date(row.original.created_at)
          ),
      },
      {
        id: "updatedAt",
        header: t("projectTable.headers.updatedAt"),
        cell: ({ row }) =>
          new Intl.DateTimeFormat(i18n.languages[0]).format(
            new Date(row.original.updated_at)
          ),
      },
      // Add other columns here
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const handleClickRow = (
    e: React.MouseEvent<HTMLTableRowElement>,
    project: IProject
  ) => {
    const target = e.target as HTMLElement;
    const dataType = target
      .closest("[data-action]")
      ?.getAttribute("data-action");
    if (dataType === "delete-project" || dataType === "edit-project") {
      return;
    } else if (dataType === "open-project") {
      onClickProject(project.id);
    }
  };

  return (
    <div className="rounded-md border p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
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
              data-action="open-project"
              key={row.id}
              onClick={(e) => {
                handleClickRow(e, row.original);
              }}
              className="hover:cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <DrawerFormProject
                    componentTrigger={<Edit size={20} color="#FFF" />}
                    projectData={row.original}
                  />
                  <ModalConfirmDelete
                    key={row.original.id}
                    title={t("modalConfirmDelete.projectTitle")}
                    onConfirm={() => onDeleteProject?.(row.original.id)}
                    componentTrigger={
                      <Trash size={20} className="text-destructive" />
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
