import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { floorsColumns } from "@/components/columns/floors";
import { CommonTable, DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { IUnit } from "@/types/units";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";

const fakeUnit = {
  id: "1",
  name: "Unidade 1",
  co2: "100 KgCO2/m²",
  energy: "200 MJ/m²",
  density: "50 m³/m²",
  floors: [
    {
      id: "1",
      co2: "50 KgCO2/m²",
      energy: "100 MJ/m²",
      density: "30 m³/m²",
      repetitions: 1,
      area: 100,
      height: 3,
      tower_name: "Torre A",
      underground: false,
      color: "#c9c9c9",
    },
    {
      id: "2",
      co2: "70 KgCO2/m²",
      energy: "150 MJ/m²",
      density: "40 m³/m²",
      repetitions: 2,
      area: 120,
      height: 3,
      tower_name: "Torre B",
      underground: false,
      color: "#d0d0d0",
    },
  ],
  constructiveTechnologies: [
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
};

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/"
)({
  component: RouteComponent,
});

// Type guard to check if the unit has tower property
function isUnitWithTower(unit: any): unit is IUnit {
  return unit && typeof unit === "object" && "tower" in unit;
}

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });

  const { data: unitData, isLoading } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: () => getUnitByUUID(projectId, unitId),
    enabled: !!projectId && !!unitId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const unit = unitData?.data?.unit || unitData?.data || unitData;

  // Use type guard to safely access tower property
  const unitWithTower = isUnitWithTower(unit) ? unit : null;

  const navigate = Route.useNavigate();

  if (isLoading) {
    return <div>Carregando unidade...</div>;
  }

  if (!unit) {
    return <div>Unidade não encontrada</div>;
  }

  const handleClickConstructiveTechnologies = async () => {
    navigate({
      to: "./constuctive-technologies",
    });
  };

  const groupedFloors = unitWithTower?.tower?.floors
    ? Object.values(
        unitWithTower.tower.floors.reduce(
          (acc, floor) => {
            const groupId = floor.group_id;

            if (!acc[groupId]) {
              acc[groupId] = {
                ...floor,
                repetitions: 1,
              };
            } else {
              acc[groupId].repetitions += 1;
            }

            return acc;
          },
          {} as Record<string, any>
        )
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      <CommonTable
        tableName="Pavimentos"
        columns={floorsColumns}
        data={groupedFloors}
        isSelectable={true}
        onSelectionChange={console.log}
        actions={
          <DrawerFormUnit
            projectId={projectId}
            unitId={unitId}
            triggerComponent={
              <Button variant="outline" className="mt-4">
                Editar Unidade
              </Button>
            }
          />
        }
      />
      <Divider />
      <CommonTable
        tableName="Tecnologias Construtivas"
        data={fakeUnit.constructiveTechnologies}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={true}
        actions={
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleClickConstructiveTechnologies}
          >
            Ver Tecnologias Construtivas
          </Button>
        }
      />
    </div>
  );
}
