import { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../ui/button";

export const unitsColumns: ColumnDef<any>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => row.original.name || "-",
  },
  {
    accessorKey: "co2",
    header: "CO2",
    cell: ({ row }) => row.original.co2 || "-",
  },
  {
    accessorKey: "energy",
    header: "Energia",
    cell: ({ row }) => row.original.energy || "-",
  },
  {
    accessorKey: "density",
    header: "Densidade",
    cell: ({ row }) => row.original.density || "-",
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const navigate = useNavigate();
      const { projectId } = useParams({
        from: "/_private/new_projects/$projectId/",
      });

      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: `/new_projects/${projectId}/unit/${row.original.id}`,
              })
            }
          >
            Detalhes
          </Button>
        </div>
      );
    },
  },
];
