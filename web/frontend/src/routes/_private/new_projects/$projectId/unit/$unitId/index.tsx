import { getFloorsBenchmark } from "@/actions/benchmarks/getFloors";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { floorsColumns } from "@/components/columns/floors";
import { CommonTable, DrawerFormUnit } from "@/components/layout";
import FloorSummary from "@/components/summaryVariants/floors";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { useSummary } from "@/context/summaryContext";
import { IConsumption } from "@/types/modules";
import { IUnit, TTowerFloorCategory } from "@/types/units";
import { getCategoryFromIndex } from "@/utils/unitConversions";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type TGroupedFloor = IConsumption &
  Omit<TTowerFloorCategory, "consumption"> & {
    repetitions: number;
  };

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
      type: "concrete_wall",
      co2_min: 50,
      co2_max: 100,
      energy_min: 200,
      energy_max: 400,
    },
    {
      id: "2",
      type: "beam_column",
      co2_min: 30,
      co2_max: 80,
      energy_min: 150,
      energy_max: 300,
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
  const { setSummaryContext } = useSummary();
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
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const handleSelectionChange = (selected: any) => {
    setSelectedFloors(selected);
  };
  const { data: benchmarkData } = useQuery({
    queryKey: ["floor-benchmarks"],
    queryFn: getFloorsBenchmark,
  });
  useEffect(() => {
    if (!benchmarkData?.data) return;
    setSummaryContext({
      component: (
        <FloorSummary floors={selectedFloors} data={benchmarkData.data} />
      ),
      title: "Floor Comparison",
    });
  }, [setSummaryContext, selectedFloors, benchmarkData]);

  const groupedFloors: TGroupedFloor[] = unitWithTower?.tower?.floors
    ? Object.values(
        unitWithTower.tower.floors.reduce(
          (acc, floor) => {
            const groupId = floor.group_id;
            const { consumption, ...restFloor } = floor;

            if (!acc[groupId]) {
              acc[groupId] = {
                ...restFloor,
                ...consumption,
                repetitions: 1,
              };
            } else {
              acc[groupId].repetitions += 1;
              acc[groupId].co2_min =
                (acc[groupId].co2_min * (acc[groupId].repetitions - 1) +
                  consumption.co2_min) /
                acc[groupId].repetitions;
              acc[groupId].co2_max =
                (acc[groupId].co2_max * (acc[groupId].repetitions - 1) +
                  consumption.co2_max) /
                acc[groupId].repetitions;
              acc[groupId].energy_min =
                (acc[groupId].energy_min * (acc[groupId].repetitions - 1) +
                  consumption.energy_min) /
                acc[groupId].repetitions;
              acc[groupId].energy_max =
                (acc[groupId].energy_max * (acc[groupId].repetitions - 1) +
                  consumption.energy_max) /
                acc[groupId].repetitions;
            }

            return acc;
          },
          {} as Record<string, any>
        )
      ).sort((a, b) => {
        const categoryOrder = {
          penthouse_floor: 0,
          standard_floor: 1,
          ground_floor: 2,
          basement_floor: 3,
        };

        const aCategory = a.category || getCategoryFromIndex(a.index || 0);
        const bCategory = b.category || getCategoryFromIndex(b.index || 0);

        const aCategoryOrder =
          categoryOrder[aCategory as keyof typeof categoryOrder];
        const bCategoryOrder =
          categoryOrder[bCategory as keyof typeof categoryOrder];

        if (aCategoryOrder !== bCategoryOrder) {
          return aCategoryOrder - bCategoryOrder;
        }

        if (a.index !== undefined && b.index !== undefined) {
          return b.index - a.index;
        }

        return (a.name || "").localeCompare(b.name || "");
      })
    : [];

  const calculateAverageMetrics = (floors: TGroupedFloor[]) => {
    const floorTotal = floors.reduce(
      (acc, curr) => acc + curr.repetitions * curr.area,
      0
    );

    const sumCO2Min = floors.reduce(
      (acc, curr) => acc + curr.co2_min * curr.area * curr.repetitions,
      0
    );
    const sumCO2Max = floors.reduce(
      (acc, curr) => acc + curr.co2_max * curr.area * curr.repetitions,
      0
    );
    const sumEnergyMin = floors.reduce(
      (acc, curr) => acc + curr.energy_min * curr.area * curr.repetitions,
      0
    );
    const sumEnergyMax = floors.reduce(
      (acc, curr) => acc + curr.energy_max * curr.area * curr.repetitions,
      0
    );

    return {
      co2_min: `${(sumCO2Min / floorTotal).toFixed(2)} KgCO2/m²`,
      co2_max: `${(sumCO2Max / floorTotal).toFixed(2)} KgCO2/m²`,
      energy_min: `${(sumEnergyMin / floorTotal).toFixed(2)} MJ/m²`,
      energy_max: `${(sumEnergyMax / floorTotal).toFixed(2)} MJ/m²`,
    };
  };

  if (isLoading) {
    return <div>Carregando unidade...</div>;
  }

  if (!unit) {
    return <div>Unidade não encontrada</div>;
  }

  const handleClickConstructiveTechnologies = async () => {
    navigate({
      to: "./constructive-technologies",
    });
  };

  const averageMetrics = calculateAverageMetrics(groupedFloors);

  return (
    <div className="flex flex-col gap-4">
      <CommonTable
        tableName="Pavimentos"
        columns={floorsColumns}
        data={groupedFloors}
        isSelectable={true}
        isInteractive={true}
        onSelectionChange={handleSelectionChange}
        lastRow={{ type: "Média", data: averageMetrics }}
        actions={
          <DrawerFormUnit
            projectId={projectId}
            unitId={unitId}
            triggerComponent={
              <Button variant="bipc" className="mt-4" size="sm">
                Editar Unidade
              </Button>
            }
          />
        }
      />
      <Divider />
      <div className="flex items-center gap-2">
        <TabsContainer
          tabs={["Em uso"]}
          selectedTab="Em uso"
          handleTabClick={console.log}
        />
        {/* <Button
          variant="bipc"
          className="cursor-pointer rounded-t-lg px-4 py-2"
          onClick={() => console.log("Go to add new constructive technology")}
        >
          <Plus />
        </Button> */}
      </div>
      <CommonTable
        tableName="Tecnologia Construtiva (módulo de cálculo)"
        data={fakeUnit.constructiveTechnologies}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
        collapsed={true}
        actions={
          <Button
            variant="bipc"
            size="sm"
            onClick={handleClickConstructiveTechnologies}
          >
            Editar Tecnologias
          </Button>
        }
      />
    </div>
  );
}
