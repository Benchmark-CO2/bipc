import { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { IUnit } from "@/types/units";
import { TConsumption } from "@/types/projects";

export const unitsColumns: ColumnDef<
  Pick<IUnit, "name" | "id"> & TConsumption
>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => row.original.name || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO2 max",
    cell: ({ row }) => row.original?.co2_max || "-",
  },
  {
    accessorKey: "co2_min",
    header: "CO2 min",
    cell: ({ row }) => row.original?.co2_min || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energia max",
    cell: ({ row }) => row.original?.energy_max || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energia min",
    cell: ({ row }) => row.original?.energy_min || "-",
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
