import { getUnitsBenchmark } from "@/actions/benchmarks/getUnits";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { unitsColumns } from "@/components/columns/units";
import UnitsSummary from "@/components/summaryVariants/units";
import Divider from "@/components/ui/divider";
import { useSummary } from "@/context/summaryContext";
import { TConsumption, TProjectUnit } from "@/types/projects";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import CommonTable from "../common-table";

const ProjectView = ({
  projectId,
  projectConsumptions,
}: {
  projectId: string;
  projectConsumptions: TConsumption[];
}) => {
  const navigate = useNavigate();
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
  });
  const { data: benchmarkData } = useQuery({
    queryKey: ["units-benchmarks"],
    queryFn: getUnitsBenchmark,
  });
  const [selectedUnits, setSelectedUnits] = useState<TProjectUnit[]>([]);
  const { setSummaryContext } = useSummary();
  const handleSelectionChange = (el: any) => {
    setSelectedUnits(el);
  };

  const units =
    projectData?.data?.project?.units?.map((unit) => ({
      ...unit,
      ...(unit?.consumptions?.total || {}),
    })) || [];

  const avgConsumptions = units.reduce(
    (acc, unit) => {
      const total = unit.consumptions?.total;
      if (total) {
        acc.co2_min += total.co2_min || 0;
        acc.co2_max += total.co2_max || 0;
        acc.energy_min += total.energy_min || 0;
        acc.energy_max += total.energy_max || 0;
        acc.area += unit.area || 0;
      }
      return acc;
    },
    {
      co2_min: 0,
      co2_max: 0,
      energy_min: 0,
      energy_max: 0,
      area: 0,
    }
  );

  if (units.length > 0) {
    avgConsumptions.co2_min /= units.length;
    avgConsumptions.co2_max /= units.length;
    avgConsumptions.energy_min /= units.length;
    avgConsumptions.energy_max /= units.length;
    avgConsumptions.area /= units.length;
  }

  const finalAvgConsumptions = {
    co2_min: `${avgConsumptions.co2_min.toInternational()} `,
    co2_max: `${avgConsumptions.co2_max.toInternational()} `,
    energy_min: `${avgConsumptions.energy_min.toInternational()} `,
    energy_max: `${avgConsumptions.energy_max.toInternational()} `,
  };

  useEffect(() => {
    if (!benchmarkData?.data) return;
    setSummaryContext({
      component: (
        <UnitsSummary
          selectedUnits={selectedUnits.length ? selectedUnits : (units as any)}
          project={projectData?.data?.project as any}
          data={benchmarkData.data}
          units={units || []}
          someSelected={selectedUnits.length > 0}
        />
      ),
      title: "Unidade Comparison",
    });
  }, [setSummaryContext, selectedUnits, benchmarkData]);

  return (
    <div className="flex flex-col gap-4">
      <CommonTable
        tableName="Unidades"
        data={units || []}
        columns={unitsColumns}
        isSelectable={true}
        isInteractive={true}
        onSelectionChange={handleSelectionChange}
        onClickRow={(rowData: TProjectUnit) =>
          navigate({
            to: `/new_projects/${projectId}/unit/${rowData.id}`,
          })
        }
        lastRow={{ type: "Média", data: finalAvgConsumptions }}
      />
      <Divider />
      <CommonTable
        tableName="Tecnologias Construtivas"
        data={projectConsumptions || []}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
        collapsed={false}
      />
    </div>
  );
};

export default ProjectView;
