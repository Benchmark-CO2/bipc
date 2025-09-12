import { getProjectByUUID } from "@/actions/projects/getProject";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { unitsColumns } from "@/components/columns/units";
import UnitsSummary from '@/components/summaryVariants/units';
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { useSummary } from '@/context/summaryContext';
import { TProjectUnit } from '@/types/projects';
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from 'react';
import CommonTable from "../common-table";
import DrawerFormUnit from "../drawer-form-unit";

const fakeTechnologies = [
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
];

const ProjectView = ({ projectId }: { projectId: string }) => {
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
  });
  const [selectedUnits, setSelectedUnits] = useState<TProjectUnit[]>([])
  const { setSummaryContext } = useSummary()
  const handleSelectionChange = (el: any) => {
    setSelectedUnits(el)
    console.log("Selected items:", el);
  };
  const units = projectData?.data?.project?.units?.map((unit) => ({
    ...unit,
    ...unit.consumption,
  })) || [];

  useEffect(() => {
    setSummaryContext({
      component: <UnitsSummary 
        units={selectedUnits as any}
      />,
      title:'Unidade Comparison',
    });
  }, [setSummaryContext, selectedUnits]);

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
        data={fakeTechnologies}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={false}
      />
    </div>
  );
};

export default ProjectView;
