import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { CommonTable, DrawerFormModule } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, Star, Trash } from "lucide-react";

const fakeOptions = [
  {
    id: "1",
    title: "Option 1",
    active: false,
    constructive_technologies: [
      {
        id: "1",
        name: "Bloco Estrutural 1",
        co2: "50 KgCO2/m²",
        energy: "100 MJ/m²",
        density: "30 m³/m²",
      },
      {
        id: "2",
        name: "Alvenaria 1",
        co2: "70 KgCO2/m²",
        energy: "150 MJ/m²",
        density: "40 m³/m²",
      },
    ],
  },
  {
    id: "2",
    title: "Option 2",
    active: false,
    constructive_technologies: [
      {
        id: "3",
        name: "Viga Pilar",
        co2: "90 KgCO2/m²",
        energy: "200 MJ/m²",
        density: "70 m³/m²",
      },
    ],
  },
  {
    id: "3",
    title: "Option 3",
    active: true,
    constructive_technologies: [
      {
        id: "1",
        name: "Bloco Estrutural 1",
        co2: "50 KgCO2/m²",
        energy: "100 MJ/m²",
        density: "30 m³/m²",
      },
      {
        id: "2",
        name: "Alvenaria 1",
        co2: "70 KgCO2/m²",
        energy: "150 MJ/m²",
        density: "40 m³/m²",
      },
      {
        id: "3",
        name: "Viga Pilar",
        co2: "90 KgCO2/m²",
        energy: "200 MJ/m²",
        density: "70 m³/m²",
      },
    ],
  },
];

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies/"
)({
  component: RouteComponent,
});

const OptionMenu = ({ detail }: { detail: any }) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Star
          className={`h-4 w-4 ${
            detail.active
              ? "fill-yellow-500 text-yellow-500"
              : "text-gray-400 hover:text-yellow-500"
          }`}
        />
      </Button>
      <Input type="text" placeholder="Option title" value={detail.title} />
    </div>
  );
};

const newColumns: ColumnDef<any>[] = [
  ...constructiveTechnologies,
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log(row.original)}
          >
            Editar
          </Button>
        </div>
      );
    },
  },
];

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies",
  });

  return (
    <div className="flex flex-col gap-4">
      {fakeOptions.map((option) => (
        <div
          key={option.id}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full"
        >
          <div className="flex items-center gap-2 justify-between w-full">
            <CommonTable
              tableName={<OptionMenu detail={option} />}
              data={option.constructive_technologies}
              columns={newColumns}
              isSelectable={true}
              isInteractive={true}
              onSelectionChange={console.log}
              actions={
                <>
                  <DrawerFormModule
                    projectId={projectId}
                    unitId={unitId}
                    triggerComponent={
                      <Button variant="outline" size="sm">
                        Adicionar Tecnologia
                      </Button>
                    }
                    type="concrete_wall"
                  />
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4 text-red-700" />
                  </Button>
                </>
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
