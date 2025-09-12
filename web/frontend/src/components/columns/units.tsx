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
    cell: ({ row }) => (
      <div className="text-left">{row.original.name || "-"}</div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original?.co2_max.toFixed(2)} KgCO₂/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO2 min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original?.co2_min.toFixed(2)} KgCO₂/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original?.energy_max.toFixed(2)} MJ/m²` || "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {`${row.original?.energy_min.toFixed(2)} MJ/m²` || "-"}
      </div>
    ),
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
        <div className="flex items-center gap-2 justify-end">
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
