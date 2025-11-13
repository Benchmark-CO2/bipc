import { getFloorsBenchmark } from "@/actions/benchmarks/getFloors";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { floorsColumns } from "@/components/columns/floors";
import { CommonTable } from "@/components/layout";
import DrawerFormDisciplines from "@/components/layout/drawer-form-disciplines";
import FloorSummary from "@/components/summaryVariants/floors";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { FilterTabs } from "@/components/ui/filter-tabs";
import NotFoundList from "@/components/ui/not-found-list";
import { useSummary } from "@/context/summaryContext";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { TRoleConsumptions } from "@/types/disciplines";
import { IConsumption } from "@/types/modules";
import {
  IProject,
  TConsumption,
  TConsumptionPerModule,
  TProjectUnit,
} from "@/types/projects";
import { IUnit, TTowerFloorCategory } from "@/types/units";
import { formatNumber } from '@/utils/numbers';
import { getCategoryFromIndex } from "@/utils/unitConversions";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useLoaderData,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { Plus, SquareArrowOutUpRight, Upload } from "lucide-react";
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
  validateSearch: (search: Record<string, unknown>) => {
    return {
      dcp: (search.dcp as string) || undefined,
    };
  },
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

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });
  const { unitConsumptions } = useLoaderData({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });
  const search = useSearch({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });
  const { hasPermission } = useProjectPermissions(projectId);

  const { setSummaryContext } = useSummary();
  const { data: unitData, isLoading } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: async () => {
      if (projectId && unitId) {
        const res = await getUnitByUUID(projectId, unitId);
        return { unit: res.data.unit, roles: res.data.roles };
      }
      return null;
    },
    enabled: !!projectId && !!unitId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const unit = unitData?.unit;
  const roles = unitData?.roles;

  const navigate = Route.useNavigate();
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>(
    "Todas as Disciplinas"
  );

  const getFilteredConsumptions = () => {
    if (!roles || roles.length === 0) return [];

    if (selectedTab === "Todas as Disciplinas") {
      const moduleTypes = unitConsumptions.map((item) => item.type);

      return moduleTypes.map((type) => {
        const summedConsumption = roles.reduce(
          (acc, role) => {
            const roleConsumptions =
              (role as any).consumptions || (role as any).consumption;

            if (!roleConsumptions || !(type in roleConsumptions)) {
              return acc;
            }

            const roleConsumption = roleConsumptions[
              type as keyof TConsumptionPerModule
            ] as TConsumption;

            if (roleConsumption) {
              return {
                co2_min: acc.co2_min + (roleConsumption.co2_min || 0),
                co2_max: acc.co2_max + (roleConsumption.co2_max || 0),
                energy_min: acc.energy_min + (roleConsumption.energy_min || 0),
                energy_max: acc.energy_max + (roleConsumption.energy_max || 0),
              };
            }
            return acc;
          },
          { co2_min: 0, co2_max: 0, energy_min: 0, energy_max: 0 }
        );

        return {
          type,
          ...summedConsumption,
        };
      });
    } else {
      const selectedRole = roles.find((role) => role.name === selectedTab);
      if (!selectedRole) return [];

      const roleConsumptions =
        (selectedRole as any).consumptions || (selectedRole as any).consumption;
      if (!roleConsumptions) return [];

      return Object.keys(roleConsumptions)
        .filter((key) => key !== "total")
        .map((type) => {
          const consumption = roleConsumptions[
            type as keyof TConsumptionPerModule
          ] as TConsumption;
          return {
            type,
            co2_min: consumption?.co2_min || 0,
            co2_max: consumption?.co2_max || 0,
            energy_min: consumption?.energy_min || 0,
            energy_max: consumption?.energy_max || 0,
          };
        });
    }
  };

  const filteredConsumptions = getFilteredConsumptions();

  const calculateTotalConsumptions = () => {
    return filteredConsumptions.reduce(
      (acc, curr) => ({
        co2_min: acc.co2_min + (curr.co2_min || 0),
        co2_max: acc.co2_max + (curr.co2_max || 0),
        energy_min: acc.energy_min + (curr.energy_min || 0),
        energy_max: acc.energy_max + (curr.energy_max || 0),
      }),
      { co2_min: 0, co2_max: 0, energy_min: 0, energy_max: 0 }
    );
  };

  const totalConsumptions = calculateTotalConsumptions();

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
          selectedFloors={
            selectedFloors.length ? selectedFloors : (groupedFloors as any)
          }
          floors={groupedFloors}
          data={benchmarkData.data}
          unit={unit as IUnit}
          someSelected={selectedFloors.length > 0}
        />
      ),
      title: "Floor Comparison",
    });
  }, [setSummaryContext, selectedFloors, benchmarkData]);

  const groupedFloors: TGroupedFloor[] = unit?.floors
    ? Object.values(
        unit.floors.reduce(
          (acc, floor) => {
            const groupId = floor.group_id;
            const { consumptions, ...restFloor } = floor;

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
      co2_min: `${(sumCO2Min / floorTotal).toInternational()}`,
      co2_max: `${(sumCO2Max / floorTotal).toInternational()}`,
      energy_min: `${(sumEnergyMin / floorTotal).toInternational()}`,
      energy_max: `${(sumEnergyMax / floorTotal).toInternational()}`,
      area: `-`,
    };
  };

  const onSelectedTabChange = (tab: string) => {
    let dcpId = "";
    if (tab === "Todas as Disciplinas") {
      dcpId = roles?.find((role) => role.is_protected)?.id || "";
    } else {
      const selectedRole = roles?.find((role) => role.name === tab);
      dcpId = selectedRole ? selectedRole.id : "";
    }

    setSelectedTab(tab);
    navigate({
      search: dcpId ? { dcp: dcpId } : { dcp: undefined },
      replace: true,
    });
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
      search: search,
    });
  };

  const averageMetrics = calculateAverageMetrics(groupedFloors);
  const roleTabs: string[] =
    roles
      ?.filter((el) => !el.is_protected)
      .map((role: TRoleConsumptions) => role.name) || [];

  const selectedRole = roles?.find((role) => role.id === search.dcp);

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
                tabs={["Todas as Disciplinas"]}
                selectedTab={selectedTab}
                onTabSelect={(tab) => onSelectedTabChange(tab)}
                subTabs={roleTabs}
                selectedSubTab={selectedTab}
                onSubTabSelect={(tab) => onSelectedTabChange(tab)}
                fullWidth
              />
              <Button variant="outline-bipc" size="icon-lg" disabled>
                <Upload />
              </Button>
              {hasPermission("create:role") && (
                <DrawerFormDisciplines
                  componentTrigger={
                    <Button variant="bipc" size="icon-lg">
                      <Plus />
                    </Button>
                  }
                  projectId={projectId}
                  unitId={unitId}
                />
              )}
              {(hasPermission("*:*") || selectedRole?.is_member) && (
                <Button
                  variant="bipc"
                  size="icon-lg"
                  onClick={handleClickConstructiveTechnologies}
                  disabled={selectedTab === "Todas as Disciplinas"}
                >
                  <SquareArrowOutUpRight />
                </Button>
              )}
            </div>
          </div>
        }
        data={filteredConsumptions}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
        isExpandable={false}
        lastRow={{
          data: {
            co2_min: `${totalConsumptions.co2_min.toInternational()}`,
            co2_max: `${totalConsumptions.co2_max.toInternational()}`,
            energy_min: `${totalConsumptions.energy_min.toInternational()}`,
            energy_max: `${totalConsumptions.energy_max.toInternational()}`,
          },
          type: "Total",
        }}
        customEmptyComponent={
          roleTabs.length === 0 ? (
            <NotFoundList
              message="Sem Disciplinas para exibir"
              showIcon={false}
              description={`Você ainda não criou nenhuma disciplina para esta unidade. Crie uma disciplina para começar a adicionar tecnologias construtivas.`}
              button={
                <DrawerFormDisciplines
                  componentTrigger={
                    <Button variant="bipc">Adicionar Disciplina</Button>
                  }
                  projectId={projectId}
                  unitId={unitId}
                />
              }
            />
          ) : undefined
        }
      />
    </div>
  );
}
