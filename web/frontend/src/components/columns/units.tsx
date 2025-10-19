import { TConsumption, TProjectUnit } from "@/types/projects";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";

export const unitsColumns: ColumnDef<
  Pick<TProjectUnit, "name" | "id" | "area"> & TConsumption
>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <div className="text-left">{row.original.name || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => <div className="text-center">Área Total (m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.area?.toFixed(1)
          ? `${row.original?.area?.toFixed(1)} m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_max?.toFixed(1)
          ? `${row.original?.co2_max?.toFixed(1)} KgCO₂/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO2 min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_min?.toFixed(1)
          ? `${row.original?.co2_min?.toFixed(1)} KgCO₂/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_max?.toFixed(1)
          ? `${row.original?.energy_max?.toFixed(1)} MJ/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_min?.toFixed(1)
          ? `${row.original?.energy_min?.toFixed(1)} MJ/m²`
          : "-"}
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
