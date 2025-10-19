import { getUnitsBenchmark } from "@/actions/benchmarks/getUnits";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { unitsColumns } from "@/components/columns/units";
import UnitsSummary from "@/components/summaryVariants/units";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { useSummary } from "@/context/summaryContext";
import { TConsumption, TProjectUnit } from "@/types/projects";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import CommonTable from "../common-table";
import DrawerFormUnit from "../drawer-form-unit";

const ProjectView = ({
  projectId,
  projectConsumptions,
}: {
  projectId: string;
  projectConsumptions: TConsumption[];
}) => {
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
    console.log("Selected items:", el);
  };

  const units =
    projectData?.data?.project?.units?.map((unit) => ({
      ...unit,
      ...(unit?.consumptions?.total || {}),
    })) || [];

  useEffect(() => {
    if (!benchmarkData?.data) return;
    setSummaryContext({
      component: (
        <UnitsSummary
          selectedUnits={selectedUnits as any}
          project={projectData?.data?.project as any}
          data={benchmarkData.data}
          units={units || []}
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
        actions={
          <>
            <DrawerFormUnit
              triggerComponent={
                <Button variant="bipc" size="sm">
                  Adicionar Unidade
                </Button>
              }
              projectId={projectId}
            />
          </>
        }
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
