import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { unitsColumns } from "@/components/columns/units";
import { CommonTable, DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/new_projects/$projectId/")({
  component: RouteComponent,
});

const fakeUnits = [
  {
    id: "1",
    name: "Unidade 1",
    co2: "100 KgCO2/m²",
    energy: "200 MJ/m²",
    density: "50 m³/m²",
  },
  {
    id: "2",
    name: "Unidade 2",
    co2: "150 KgCO2/m²",
    energy: "250 MJ/m²",
    density: "60 m³/m²",
  },
];

const fakeTechnologies = [
  {
    id: "1",
    name: "Bloco Estrutural",
    co2: "50 KgCO2/m²",
    energy: "100 MJ/m²",
    density: "30 m³/m²",
  },
  {
    id: "2",
    name: "Alvenaria",
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
];

function RouteComponent() {
  const { projectId } = useParams({
    from: "/_private/new_projects/$projectId",
  });

  const handleSelectionChange = (selectedItems: any[]) => {
    console.log("Selected items:", selectedItems);
  };

  return (
    <div className="flex flex-col gap-4">
      <CommonTable
        tableName="Unidades"
        data={fakeUnits}
        columns={unitsColumns}
        isSelectable={true}
        isInteractive={true}
        onSelectionChange={handleSelectionChange}
        actions={
          <>
            <DrawerFormUnit
              triggerComponent={
                <Button variant="outline" size="sm">
                  Adicionar Unidade
                </Button>
              }
              projectId={projectId}
            />
            <Button variant="outline" size="sm">
              Editar Colaboradores
            </Button>
          </>
        }
      />
      <Divider />
      <CommonTable
        tableName="Tecnologias Construtivas"
        data={fakeTechnologies}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
      />
    </div>
  );
}
