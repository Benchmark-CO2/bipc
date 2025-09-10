import { getProjectByUUID } from "@/actions/projects/getProject";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import CommonTable from "../common-table";
import { unitsColumns } from "@/components/columns/units";
import DrawerFormUnit from "../drawer-form-unit";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";

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

const ProjectView = ({ projectId }: { projectId: string }) => {
  const { data: projectData } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectByUUID(projectId),
  });
  const navigate = useNavigate();

  const handleSelectionChange = () => {
    // console.log("Selected items:", selectedItems);
  };

  const handleGoToCollaborators = () => {
    navigate({
      to: ".",
      search: { tab: "colaboradores" },
      replace: true,
    });
  };

  const units = projectData?.data?.project?.units.map((unit) => ({
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
