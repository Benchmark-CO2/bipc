import { getFloorsBenchmark } from "@/actions/benchmarks/getFloors";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { floorsColumns } from "@/components/columns/floors";
import { CommonTable } from "@/components/layout";
import FloorSummary from "@/components/summaryVariants/floors";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { useSummary } from "@/context/summaryContext";
import { IConsumption } from "@/types/modules";
import {
  IProject,
  TConsumptionPerModule,
  TProjectUnit,
} from "@/types/projects";
import { IUnit, TTowerFloorCategory } from "@/types/units";
import { getCategoryFromIndex } from "@/utils/unitConversions";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useLoaderData,
  useParams,
} from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";

type TGroupedFloor = IConsumption &
  Omit<TTowerFloorCategory, "consumptions"> & {
    repetitions: number;
    area: number;
  };

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/"
)({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { projectId, unitId } = params;

    await context.queryClient.ensureQueryData({
      queryKey: ["project", projectId],
      queryFn: () => getProjectByUUID(projectId),
    });

    const projectData = context.queryClient.getQueryData<any>([
      "project",
      projectId,
    ]);
    const project: IProject = projectData?.data?.project;

    const unit = project.units.find((u: TProjectUnit) => u.id === unitId);
    const unitConsumptions = Object.keys(unit?.consumptions || {})
      .filter((key) => key !== "total")
      .map((key) => ({
        type: key,
        ...(unit?.consumptions as TConsumptionPerModule)[
          key as keyof TConsumptionPerModule
        ],
      }));
    return { unitConsumptions };
  },
});

// Type guard to check if the unit has tower property
function isUnitWithTower(unit: any): unit is IUnit {
  return unit && typeof unit === "object" && "tower" in unit;
}

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });
  const { unitConsumptions } = useLoaderData({
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
        <FloorSummary
          selectedFloors={selectedFloors}
          floors={groupedFloors}
          data={benchmarkData.data}
          unit={unit as IUnit}
        />
      ),
      title: "Floor Comparison",
    });
  }, [setSummaryContext, selectedFloors, benchmarkData]);

  const groupedFloors: TGroupedFloor[] = unitWithTower?.tower?.floors
    ? Object.values(
        unitWithTower.tower.floors.reduce(
          (acc, floor) => {
            const groupId = floor.group_id;
            const { consumptions, ...restFloor } = floor;

            // Provide default consumption values if consumption is undefined
            const safeConsumption = consumptions?.total || {
              co2_min: 0,
              co2_max: 0,
              energy_min: 0,
              energy_max: 0,
            };

            if (!acc[groupId]) {
              acc[groupId] = {
                ...restFloor,
                ...safeConsumption,
                area: restFloor.area,
                repetitions: 1,
              };
            } else {
              acc[groupId].repetitions += 1;
              acc[groupId].area =
                (acc[groupId].area * (acc[groupId].repetitions - 1) +
                  restFloor.area) /
                acc[groupId].repetitions;
              acc[groupId].co2_min =
                (acc[groupId].co2_min * (acc[groupId].repetitions - 1) +
                  (safeConsumption.co2_min || 0)) /
                acc[groupId].repetitions;
              acc[groupId].co2_max =
                (acc[groupId].co2_max * (acc[groupId].repetitions - 1) +
                  (safeConsumption.co2_max || 0)) /
                acc[groupId].repetitions;
              acc[groupId].energy_min =
                (acc[groupId].energy_min * (acc[groupId].repetitions - 1) +
                  (safeConsumption.energy_min || 0)) /
                acc[groupId].repetitions;
              acc[groupId].energy_max =
                (acc[groupId].energy_max * (acc[groupId].repetitions - 1) +
                  (safeConsumption.energy_max || 0)) /
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
      co2_min: `${(sumCO2Min / floorTotal).toFixed(1)} KgCO2/m²`,
      co2_max: `${(sumCO2Max / floorTotal).toFixed(1)} KgCO2/m²`,
      energy_min: `${(sumEnergyMin / floorTotal).toFixed(1)} MJ/m²`,
      energy_max: `${(sumEnergyMax / floorTotal).toFixed(1)} MJ/m²`,
      area: `-`,
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
      />
      <Divider />
      <CommonTable
        tableName={
          <div>
            Tecnologia Construtiva (módulo de cálculo)
            <div className="flex items-center gap-2 mt-4">
              <FilterTabs
                tabs={["Todas as Unidades"]}
                selectedTab="Todas as Unidades"
                onTabSelect={console.log}
                fullWidth
              />
              <Button variant="outline-bipc" size="icon-lg" disabled>
                <Upload />
              </Button>
              <Button
                variant="bipc"
                size="icon-lg"
                onClick={handleClickConstructiveTechnologies}
              >
                <Plus />
              </Button>
            </div>
          </div>
        }
        data={unitConsumptions}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
        collapsed={false}
      />
    </div>
  );
}
