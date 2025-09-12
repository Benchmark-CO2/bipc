import { getProjectByUUID } from "@/actions/projects/getProject";
import { useQuery } from "@tanstack/react-query";
import CommonTable from "../common-table";
import { unitsColumns } from "@/components/columns/units";
import DrawerFormUnit from "../drawer-form-unit";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";

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

  const handleSelectionChange = () => {
    // console.log("Selected items:", selectedItems);
  };

  const units = projectData?.data?.project?.units?.map((unit) => ({
    ...unit,
    ...unit.consumption,
  }));

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
